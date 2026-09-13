import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import Payment from "../models/Payment.js";
import Showtime from "../models/Showtime.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import SeatHold from "../models/SeatHold.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { createTicketsForPaidBooking, hashQrToken } from "../services/ticketService.js";
import { issueBookingOrderQr, parseBookingQrPayload } from "../services/bookingOrderService.js";
import { validateCoupleSeatSelection } from "../services/seatHoldPolicy.js";
import { isBrokenSeatType } from "../utils/seatTypes.js";
import { isSeatInMaintenance } from "../utils/seatStatus.js";

const transactionUnsupported = (error) => /transaction numbers are only allowed|replica set member or mongos|only servers in a sharded cluster/i.test(String(error?.message || ""));
const idOf = (value) => value?._id || value || null;
const seatLabel = (seat = {}) => String(seat.seat_code || `${seat.seat_row || ""}${seat.seat_number || ""}`).trim().toUpperCase();
const counterCode = () => `POS${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.toUpperCase();
const isCoupleSeat = (item) => {
  const name = String(item?.seat_id?.seat_type_id?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  return name.includes("doi") || name.includes("couple") || name.includes("double");
};
const calculateSeatTotal = (seats = []) => {
  const countedIds = new Set();
  const sortedSeats = [...seats].sort((first, second) => String(first.seat_id?.seat_row || "").localeCompare(String(second.seat_id?.seat_row || "")) || Number(first.seat_id?.seat_number || 0) - Number(second.seat_id?.seat_number || 0));
  return sortedSeats.reduce((total, seat, index) => {
    const seatId = String(seat._id);
    if (countedIds.has(seatId)) return total;
    countedIds.add(seatId);
    if (isCoupleSeat(seat)) {
      const nextSeat = sortedSeats[index + 1];
      if (nextSeat && isCoupleSeat(nextSeat) && String(nextSeat.seat_id?.seat_row || "") === String(seat.seat_id?.seat_row || "") && Number(nextSeat.seat_id?.seat_number || 0) === Number(seat.seat_id?.seat_number || 0) + 1) countedIds.add(String(nextSeat._id));
    }
    return total + Number(seat.price || 0);
  }, 0);
};
const normalizeComboItems = (items = []) => {
  if (!Array.isArray(items)) throw Object.assign(new Error("Danh sách combo không hợp lệ."), { statusCode: 400 });
  const quantities = new Map();
  for (const item of items) {
    const comboId = String(item?.combo_id || "").trim();
    const quantity = Number(item?.quantity);
    if (!mongoose.Types.ObjectId.isValid(comboId) || !Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error("Combo hoặc số lượng không hợp lệ."), { statusCode: 400 });
    quantities.set(comboId, (quantities.get(comboId) || 0) + quantity);
  }
  return [...quantities].map(([combo_id, quantity]) => ({ combo_id, quantity }));
};
const reserveComboStock = async ({ requestedCombos, session }) => {
  if (!requestedCombos.length) return [];
  const comboDocs = await Combo.find({ _id: { $in: requestedCombos.map((item) => item.combo_id) }, deleted_at: null, status: true }).session(session);
  if (comboDocs.length !== requestedCombos.length) throw Object.assign(new Error("Có combo không còn được bán."), { statusCode: 404 });
  const comboById = new Map(comboDocs.map((combo) => [String(combo._id), combo]));
  const reserved = [];
  try {
    for (const item of requestedCombos) {
      const combo = comboById.get(String(item.combo_id));
      const result = await Combo.updateOne({ _id: item.combo_id, deleted_at: null, status: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session });
      if (result.modifiedCount !== 1) throw Object.assign(new Error(`Combo ${combo.name} không đủ số lượng.`), { statusCode: 409 });
      reserved.push({ combo_id: combo._id, name: combo.name, price: Number(combo.price || 0), quantity: item.quantity, subtotal: Number(combo.price || 0) * item.quantity });
    }
    return reserved;
  } catch (error) {
    await Promise.all(reserved.map((item) => Combo.updateOne({ _id: item.combo_id }, { $inc: { stock: item.quantity } }, { session })));
    throw error;
  }
};
const restoreComboStock = (combos, session) => Promise.all(combos.map((item) => Combo.updateOne({ _id: item.combo_id }, { $inc: { stock: item.quantity } }, { session })));
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const getVietnamDateRange = (date) => {
  const match = DATE_PATTERN.exec(String(date || ""));
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
  const start = new Date(Date.UTC(year, month - 1, day, -7));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};
const getVietnamDay = (date = new Date()) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

export const lookupStaffBookingOrder = async (req, res) => {
  const token = parseBookingQrPayload(req.body?.qrToken);
  if (!token) return res.status(400).json({ success: false, message: "QR đơn vé không hợp lệ." });

  try {
    const booking = await Booking.findOne({
      ticketing_version: 2,
      "order_qr.token_hash": hashQrToken(token),
    }).select("booking_code status payment_status movie_snapshot showtime_snapshot seat_items combos").lean();

    if (!booking) return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé từ mã QR." });
    if (booking.status !== "confirmed" || booking.payment_status !== "paid") {
      return res.status(409).json({ success: false, message: "Đơn vé chưa thanh toán hoặc đã bị hủy." });
    }

    const seats = Array.isArray(booking.seat_items) ? booking.seat_items : [];
    const seatLabels = seats.map((item) => item.seat_label || item.seat_code).filter(Boolean);
    const seatTypes = [...new Set(seats.map((item) => item.seat_type).filter(Boolean))];

    return res.json({
      success: true,
      message: `Đã tải đơn vé ${booking.booking_code}.`,
      data: {
        qrType: "BOOKING",
        ticketCode: booking.booking_code,
        status: "ORDER",
        movie: { title: booking.movie_snapshot?.title || "" },
        showtime: { startTime: booking.showtime_snapshot?.start_time || null },
        room: { name: booking.showtime_snapshot?.room_name || "" },
        seat: {
          label: seatLabels.join(", "),
          type: seatTypes.join(", "),
        },
        booking: {
          bookingCode: booking.booking_code,
          combos: Array.isArray(booking.combos)
            ? booking.combos.map((item) => ({ name: item.name, quantity: item.quantity }))
            : [],
        },
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: "Không thể tra cứu đơn vé." });
  }
};

const runWithTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } catch (error) {
    if (transactionUnsupported(error) && process.env.NODE_ENV !== "production") return work(null);
    throw error;
  } finally { await session.endSession(); }
};

export const getCounterShowtimes = async (req, res) => {
  try {
    const now = new Date();
    const selectedDate = String(req.query?.date || getVietnamDay(now));
    const dateRange = getVietnamDateRange(selectedDate);
    if (!dateRange) return res.status(400).json({ success: false, message: "Ngày chiếu không hợp lệ." });
    const showtimes = await Showtime.find({
      deleted_at: null,
      status: "scheduled",
      start_time: { $gte: new Date(Math.max(dateRange.start.getTime(), now.getTime() + 1)), $lt: dateRange.end },
    })
      .populate("movie_id", "title poster age_limit")
      .populate({ path: "room_id", select: "name status cinema_id", populate: { path: "cinema_id", select: "name address" } })
      .sort({ start_time: 1 });
    const ids = showtimes.map((item) => item._id);
    const availableCounts = await ShowtimeSeat.aggregate([
      { $match: { showtime_id: { $in: ids }, deleted_at: null, status: "available" } },
      { $group: { _id: "$showtime_id", count: { $sum: 1 } } },
    ]);
    const countByShowtime = new Map(availableCounts.map((item) => [String(item._id), item.count]));
    return res.json({ success: true, data: showtimes.filter((item) => item.movie_id && item.room_id?.status === "active").map((item) => ({
      id: item._id, movie: { id: item.movie_id._id, title: item.movie_id.title, poster: item.movie_id.poster || "" },
      room: { id: item.room_id._id, name: item.room_id.name, cinema: item.room_id.cinema_id?.name || "" },
      start_time: item.start_time, end_time: item.end_time, status: item.status,
      available_seats: countByShowtime.get(String(item._id)) || 0,
    })) });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

export const getShiftReport = async (req, res) => {
  try {
    const selectedDate = String(req.query?.date || getVietnamDay()).trim();
    const dateRange = getVietnamDateRange(selectedDate);
    if (!dateRange) return res.status(400).json({ success: false, message: "Ngày báo cáo không hợp lệ." });

    const [staff, bookings] = await Promise.all([
      User.findOne({ _id: req.user.id, deleted_at: null }).select("full_name").lean(),
      Booking.find({
        sales_channel: "counter",
        sold_by: req.user.id,
        status: "confirmed",
        payment_status: "paid",
        paid_at: { $gte: dateRange.start, $lt: dateRange.end },
      }).select("total_price showtime_seat_ids").lean(),
    ]);

    const cashTotal = bookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
    const posTicketCount = bookings.reduce((sum, booking) => sum + (booking.showtime_seat_ids?.length || 0), 0);
    return res.json({
      success: true,
      data: {
        staff_name: staff?.full_name || "Nhân viên",
        date: selectedDate,
        cash_total: cashTotal,
        pos_ticket_count: posTicketCount,
        online_scanned_count: null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCounterSale = async (req, res) => {
  const showtimeId = String(req.body?.showtime_id || "").trim();
  const holdToken = String(req.body?.hold_token || "").trim();
  const requestedSeatIds = Array.isArray(req.body?.showtime_seat_ids) ? req.body.showtime_seat_ids.map(String) : [];
  if (!mongoose.Types.ObjectId.isValid(showtimeId) || !holdToken || !requestedSeatIds.length || new Set(requestedSeatIds).size !== requestedSeatIds.length || requestedSeatIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({ success: false, message: "Suất chiếu hoặc danh sách ghế không hợp lệ." });
  }

  try {
    const requestedCombos = normalizeComboItems(req.body?.combos || []);
    const sale = await runWithTransaction(async (session) => {
      const now = new Date();
      const showtime = await Showtime.findOne({ _id: showtimeId, deleted_at: null, status: { $in: ["scheduled", "now_showing"] }, end_time: { $gt: new Date() } })
        .populate("movie_id", "title poster age_limit")
        .populate({ path: "room_id", select: "name cinema_id", populate: { path: "cinema_id", select: "name address" } })
        .session(session);
      if (!showtime || !showtime.movie_id || !showtime.room_id) throw Object.assign(new Error("Suất chiếu không còn khả dụng."), { statusCode: 404 });

      const hold = await SeatHold.findOne({ token: holdToken, user_id: req.user.id, showtime_id: showtime._id, status: "active", expires_at: { $gt: now } }).session(session);
      if (!hold) throw Object.assign(new Error("Phiên giữ ghế tại quầy đã hết hạn hoặc không còn hợp lệ."), { statusCode: 410 });
      const heldSeatIds = new Set((hold.showtime_seat_ids || []).map(String));
      if (heldSeatIds.size !== requestedSeatIds.length || requestedSeatIds.some((seatId) => !heldSeatIds.has(seatId))) throw Object.assign(new Error("Danh sách ghế không khớp phiên giữ ghế tại quầy."), { statusCode: 409 });

      const seats = await ShowtimeSeat.find({ _id: { $in: requestedSeatIds }, showtime_id: showtime._id, deleted_at: null, status: "held", held_by: req.user.id, hold_id: hold._id, hold_expires_at: { $gt: now } })
        .populate({ path: "seat_id", select: "seat_row seat_number seat_code seat_type_id status operational_status", populate: { path: "seat_type_id", select: "name" } })
        .session(session);
      if (seats.length !== requestedSeatIds.length || seats.some((item) => isBrokenSeatType(item.seat_id?.seat_type_id) || isSeatInMaintenance(item.seat_id))) throw Object.assign(new Error("Có ghế không hợp lệ hoặc đang bảo trì trong đơn."), { statusCode: 409 });
      validateCoupleSeatSelection(seats);

      const bookingId = new mongoose.Types.ObjectId();
      const reserved = await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, showtime_id: showtime._id, deleted_at: null, status: "held", held_by: req.user.id, hold_id: hold._id }, { $set: { status: "booked", held_by: null, hold_id: null, hold_expires_at: null, reserved_by_booking_id: bookingId } }, { session });
      if (reserved.modifiedCount !== requestedSeatIds.length) {
        await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, reserved_by_booking_id: bookingId, status: "booked" }, { $set: { status: "held", held_by: req.user.id, hold_id: hold._id, hold_expires_at: hold.expires_at, reserved_by_booking_id: null } }, { session });
        throw Object.assign(new Error("Một hoặc nhiều ghế vừa được khách khác giữ hoặc đặt. Vui lòng chọn lại."), { statusCode: 409 });
      }

      let reservedCombos = [];
      try {
        reservedCombos = await reserveComboStock({ requestedCombos, session });
        const items = seats.map((item) => ({ showtime_seat_id: item._id, seat_id: idOf(item.seat_id), seat_code: String(item.seat_id?.seat_code || ""), seat_label: seatLabel(item.seat_id), seat_type: String(item.seat_id?.seat_type_id?.name || ""), price: Number(item.price || 0) }));
        const ticketTotal = calculateSeatTotal(seats);
        const comboTotal = reservedCombos.reduce((sum, item) => sum + item.subtotal, 0);
        const total = ticketTotal + comboTotal;
        const [booking] = await Booking.create([{
          _id: bookingId, booking_code: counterCode(), ticketing_version: 2, order_qr: issueBookingOrderQr(now),
          sales_channel: "counter", sold_by: req.user.id, user_id: null, seat_hold_id: hold._id, showtime_id: showtime._id, showtime_seat_ids: seats.map((item) => item._id),
          customer_name: String(req.body?.customer_name || "Khách vãng lai").trim() || "Khách vãng lai",
          customer_email: String(req.body?.customer_email || `walkin-${bookingId}@auracinema.local`).trim().toLowerCase(), customer_phone: String(req.body?.customer_phone || "").trim() || null,
          movie_snapshot: { movie_id: showtime.movie_id._id, title: showtime.movie_id.title, poster: showtime.movie_id.poster || "", age_classification: Number(showtime.movie_id.age_limit || 0) ? `T${showtime.movie_id.age_limit}` : "P" },
          showtime_snapshot: { showtime_id: showtime._id, start_time: showtime.start_time, end_time: showtime.end_time, cinema_id: idOf(showtime.room_id.cinema_id), cinema_name: showtime.room_id.cinema_id?.name || "", cinema_address: showtime.room_id.cinema_id?.address || "", room_id: showtime.room_id._id, room_name: showtime.room_id.name },
          seat_items: items, combos: reservedCombos, subtotal_price: total, total_price: total, pricing: { ticket_subtotal: ticketTotal, service_subtotal: comboTotal, subtotal: total, discount: 0, total },
          status: "confirmed", payment_status: "paid", payment_provider: "cash", payment_transaction_id: `CASH-${bookingId.toString().slice(-8).toUpperCase()}`, paid_at: now,
        }], { session });
        await Payment.create([{ booking_id: booking._id, payment_code: `CASH-${booking.booking_code}`, provider: "cash", amount: total, status: "paid", transaction_ref: booking.payment_transaction_id, transaction_id: booking.payment_transaction_id, paid_at: now }], { session });
        const issued = await createTicketsForPaidBooking(booking._id, { session, includeQrPayloads: true });
        const convertedHold = await SeatHold.updateOne({ _id: hold._id, status: "active", expires_at: { $gt: now } }, { $set: { status: "converted", converted_booking_id: booking._id } }, { session });
        if (convertedHold.modifiedCount !== 1) throw Object.assign(new Error("Phiên giữ ghế tại quầy vừa hết hạn."), { statusCode: 410 });
        return { booking, tickets: issued.tickets, qrPayloads: issued.qrPayloads };
      } catch (error) {
        await restoreComboStock(reservedCombos, session);
        await Ticket.deleteMany({ bookingId }, { session });
        await Payment.deleteMany({ booking_id: bookingId }, { session });
        await Booking.deleteOne({ _id: bookingId }, { session });
        await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, reserved_by_booking_id: bookingId, status: "booked" }, { $set: { status: "held", held_by: req.user.id, hold_id: hold._id, hold_expires_at: hold.expires_at, reserved_by_booking_id: null } }, { session });
        throw error;
      }
    });
    return res.status(201).json({ success: true, message: "Thanh toán tiền mặt thành công.", data: { booking_id: sale.booking._id, booking_code: sale.booking.booking_code, total_price: sale.booking.total_price, pricing: sale.booking.pricing, sales_channel: sale.booking.sales_channel, sold_by: sale.booking.sold_by, combos: sale.booking.combos, tickets: sale.tickets.map((ticket) => ({ id: ticket._id, code: ticket.ticketCode, seat: ticket.seatLabel, price: ticket.price })), ticket_qr_payloads: sale.qrPayloads } });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
};

export const printCounterSale = async (req, res) => {
  try {
    const filter = { _id: req.params.id, sales_channel: "counter", status: "confirmed", payment_status: "paid" };
    if (req.user.role !== "admin") filter.sold_by = req.user.id;
    const booking = await Booking.findOne(filter);
    if (!booking) return res.status(404).json({ success: false, message: "Không tìm thấy đơn bán tại quầy." });
    const now = new Date();
    await Ticket.updateMany({ bookingId: booking._id, printedAt: null, status: "VALID" }, { $set: { printedAt: now, printedBy: req.user.id } });
    const tickets = await Ticket.find({ bookingId: booking._id }).sort({ seatLabel: 1 });
    return res.json({ success: true, data: { booking_code: booking.booking_code, movie: booking.movie_snapshot.title, showtime: booking.showtime_snapshot, seats: booking.seat_items.map((item) => item.seat_label), total_price: booking.total_price, tickets: tickets.map((item) => ({ code: item.ticketCode, seat: item.seatLabel })) } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
