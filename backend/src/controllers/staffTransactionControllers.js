import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingActionLog, { createBookingActionLogSafe } from "../models/BookingActionLog.js";
import Payment from "../models/Payment.js";
import Ticket from "../models/Ticket.js";

const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"]);
const SALES_CHANNELS = new Set(["online", "counter"]);
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseVietnamDate = (value, endOfDay = false) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, -7));
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

export const buildStaffTransactionFilter = ({ query = {}, ticketBookingIds = [] } = {}) => {
  const filter = {};
  const search = String(query.q || "").trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { booking_code: regex },
      { customer_name: regex },
      { customer_email: regex },
      { customer_phone: regex },
      { payment_transaction_id: regex },
      { _id: { $in: ticketBookingIds } },
    ];
  }
  if (SALES_CHANNELS.has(query.sales_channel)) filter.sales_channel = query.sales_channel;
  if (PAYMENT_STATUSES.has(query.payment_status)) filter.payment_status = query.payment_status;
  if (query.customer_type === "member") filter.user_id = { $ne: null };
  if (query.customer_type === "guest") filter.user_id = null;
  const from = parseVietnamDate(query.date_from);
  const to = parseVietnamDate(query.date_to, true);
  if (from || to) {
    filter.created_at = {};
    if (from) filter.created_at.$gte = from;
    if (to) filter.created_at.$lt = to;
  }
  return filter;
};

const sanitizeBooking = (booking) => {
  const data = typeof booking?.toObject === "function" ? booking.toObject() : { ...booking };
  delete data.order_qr;
  return data;
};

const serializePayment = (payment) => ({
  id: payment._id,
  payment_code: payment.payment_code,
  provider: payment.provider,
  amount: payment.amount,
  status: payment.status,
  transaction_ref: payment.transaction_ref,
  transaction_id: payment.transaction_id,
  bank_code: payment.bank_code,
  response_code: payment.response_code,
  paid_at: payment.paid_at,
  created_at: payment.created_at,
});

const serializeTicket = (ticket) => ({
  id: ticket._id,
  ticket_code: ticket.ticketCode,
  seat_label: ticket.seatLabel,
  seat_type: ticket.seatType,
  price: ticket.price,
  status: ticket.status,
  checked_in_at: ticket.checkedInAt,
  printed_at: ticket.printedAt,
});

export const getStaffTransactions = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const search = String(req.query.q || "").trim();
    const searchRegex = search ? new RegExp(escapeRegex(search), "i") : null;
    const [ticketBookingIds, paymentBookingIds] = search ? await Promise.all([
      Ticket.distinct("bookingId", { ticketCode: searchRegex }),
      Payment.distinct("booking_id", { $or: [{ payment_code: searchRegex }, { transaction_ref: searchRegex }, { transaction_id: searchRegex }] }),
    ]) : [[], []];
    const relatedBookingIds = [...new Set([...ticketBookingIds, ...paymentBookingIds].map(String))];
    const filter = buildStaffTransactionFilter({ query: req.query, ticketBookingIds: relatedBookingIds });
    const [bookings, totalItems] = await Promise.all([
      Booking.find(filter)
        .populate("user_id", "full_name email phone")
        .populate("sold_by", "full_name email")
        .sort({ created_at: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);
    const bookingIds = bookings.map((booking) => booking._id);
    const [payments, tickets] = bookingIds.length ? await Promise.all([
      Payment.find({ booking_id: { $in: bookingIds } }).select("-raw_request_data -raw_return_data -payment_url").sort({ created_at: -1 }).lean(),
      Ticket.find({ bookingId: { $in: bookingIds } }).select("-qrTokenHash -qrTokenEncrypted").sort({ seatLabel: 1 }).lean(),
    ]) : [[], []];
    const paymentsByBooking = new Map();
    payments.forEach((payment) => {
      const key = String(payment.booking_id);
      if (!paymentsByBooking.has(key)) paymentsByBooking.set(key, []);
      paymentsByBooking.get(key).push(serializePayment(payment));
    });
    const ticketsByBooking = new Map();
    tickets.forEach((ticket) => {
      const key = String(ticket.bookingId);
      if (!ticketsByBooking.has(key)) ticketsByBooking.set(key, []);
      ticketsByBooking.get(key).push(serializeTicket(ticket));
    });
    return res.json({
      success: true,
      data: bookings.map((booking) => ({
        ...sanitizeBooking(booking),
        customer_type: booking.user_id ? "member" : "guest",
        payments: paymentsByBooking.get(String(booking._id)) || [],
        tickets: ticketsByBooking.get(String(booking._id)) || [],
      })),
      pagination: { page, limit, totalItems, totalPages: Math.max(Math.ceil(totalItems / limit), 1) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Không thể tải lịch sử giao dịch." });
  }
};

export const getStaffTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "ID giao dịch không hợp lệ." });
    const booking = await Booking.findById(req.params.id)
      .populate("user_id", "full_name email phone")
      .populate("sold_by", "full_name email")
      .lean();
    if (!booking) return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch." });
    await createBookingActionLogSafe({ bookingId: booking._id, adminId: req.user.id, action: "LOOKUP", result: "SUCCESS", reason: "Nhân viên tra cứu lịch sử giao dịch" });
    const [payments, tickets, actionLogs] = await Promise.all([
      Payment.find({ booking_id: booking._id }).select("-raw_request_data -raw_return_data -payment_url").sort({ created_at: -1 }).lean(),
      Ticket.find({ bookingId: booking._id }).select("-qrTokenHash -qrTokenEncrypted").sort({ seatLabel: 1 }).lean(),
      BookingActionLog.find({ bookingId: booking._id }).populate("adminId", "full_name email").sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return res.json({ success: true, data: {
      ...sanitizeBooking(booking),
      customer_type: booking.user_id ? "member" : "guest",
      payments: payments.map(serializePayment),
      tickets: tickets.map(serializeTicket),
      action_logs: actionLogs,
    } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Không thể tải chi tiết giao dịch." });
  }
};

export const addStaffTransactionNote = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "ID giao dịch không hợp lệ." });
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3 || reason.length > 1000) return res.status(400).json({ success: false, message: "Nội dung xử lý khiếu nại phải có từ 3 đến 1000 ký tự." });
    const bookingExists = await Booking.exists({ _id: req.params.id });
    if (!bookingExists) return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch." });
    const log = await createBookingActionLogSafe({ bookingId: req.params.id, adminId: req.user.id, action: "COMPLAINT_NOTE", result: "SUCCESS", reason });
    if (!log) return res.status(500).json({ success: false, message: "Không thể lưu ghi chú xử lý." });
    return res.status(201).json({ success: true, message: "Đã lưu ghi chú xử lý khiếu nại.", data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Không thể lưu ghi chú xử lý." });
  }
};
