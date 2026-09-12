import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Showtime from "../models/Showtime.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import Ticket from "../models/Ticket.js";
import { createTicketsForPaidBooking } from "../services/ticketService.js";
import { issueBookingOrderQr } from "../services/bookingOrderService.js";
import { isBrokenSeatType } from "../utils/seatTypes.js";
import { isSeatInMaintenance } from "../utils/seatStatus.js";

const transactionUnsupported = (error) => /transaction numbers are only allowed|replica set member or mongos|only servers in a sharded cluster/i.test(String(error?.message || ""));
const idOf = (value) => value?._id || value || null;
const seatLabel = (seat = {}) => String(seat.seat_code || `${seat.seat_row || ""}${seat.seat_number || ""}`).trim().toUpperCase();
const counterCode = () => `POS${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.toUpperCase();
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

export const createCounterSale = async (req, res) => {
  const showtimeId = String(req.body?.showtime_id || "").trim();
  const requestedSeatIds = Array.isArray(req.body?.showtime_seat_ids) ? req.body.showtime_seat_ids.map(String) : [];
  if (!mongoose.Types.ObjectId.isValid(showtimeId) || !requestedSeatIds.length || new Set(requestedSeatIds).size !== requestedSeatIds.length || requestedSeatIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({ success: false, message: "Suất chiếu hoặc danh sách ghế không hợp lệ." });
  }

  try {
    const sale = await runWithTransaction(async (session) => {
      const showtime = await Showtime.findOne({ _id: showtimeId, deleted_at: null, status: { $in: ["scheduled", "now_showing"] }, end_time: { $gt: new Date() } })
        .populate("movie_id", "title poster age_limit")
        .populate({ path: "room_id", select: "name cinema_id", populate: { path: "cinema_id", select: "name address" } })
        .session(session);
      if (!showtime || !showtime.movie_id || !showtime.room_id) throw Object.assign(new Error("Suất chiếu không còn khả dụng."), { statusCode: 404 });

      const seats = await ShowtimeSeat.find({ _id: { $in: requestedSeatIds }, showtime_id: showtime._id, deleted_at: null })
        .populate({ path: "seat_id", select: "seat_row seat_number seat_code seat_type_id status operational_status", populate: { path: "seat_type_id", select: "name" } })
        .session(session);
      if (seats.length !== requestedSeatIds.length || seats.some((item) => isBrokenSeatType(item.seat_id?.seat_type_id) || isSeatInMaintenance(item.seat_id))) throw Object.assign(new Error("Có ghế không hợp lệ hoặc đang bảo trì trong đơn."), { statusCode: 409 });

      const bookingId = new mongoose.Types.ObjectId();
      const reserved = await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, showtime_id: showtime._id, deleted_at: null, status: "available" }, { $set: { status: "booked", held_by: null, hold_id: null, hold_expires_at: null, reserved_by_booking_id: bookingId } }, { session });
      if (reserved.modifiedCount !== requestedSeatIds.length) {
        await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, reserved_by_booking_id: bookingId, status: "booked" }, { $set: { status: "available", reserved_by_booking_id: null } }, { session });
        throw Object.assign(new Error("Một hoặc nhiều ghế vừa được khách khác giữ hoặc đặt. Vui lòng chọn lại."), { statusCode: 409 });
      }

      try {
        const items = seats.map((item) => ({ showtime_seat_id: item._id, seat_id: idOf(item.seat_id), seat_code: String(item.seat_id?.seat_code || ""), seat_label: seatLabel(item.seat_id), seat_type: String(item.seat_id?.seat_type_id?.name || ""), price: Number(item.price || 0) }));
        const total = items.reduce((sum, item) => sum + item.price, 0);
        const now = new Date();
        const [booking] = await Booking.create([{
          _id: bookingId, booking_code: counterCode(), ticketing_version: 2, order_qr: issueBookingOrderQr(now),
          sales_channel: "counter", sold_by: req.user.id, user_id: null, showtime_id: showtime._id, showtime_seat_ids: seats.map((item) => item._id),
          customer_name: String(req.body?.customer_name || "Khách vãng lai").trim() || "Khách vãng lai",
          customer_email: String(req.body?.customer_email || `walkin-${bookingId}@auracinema.local`).trim().toLowerCase(), customer_phone: String(req.body?.customer_phone || "").trim() || null,
          movie_snapshot: { movie_id: showtime.movie_id._id, title: showtime.movie_id.title, poster: showtime.movie_id.poster || "", age_classification: Number(showtime.movie_id.age_limit || 0) ? `T${showtime.movie_id.age_limit}` : "P" },
          showtime_snapshot: { showtime_id: showtime._id, start_time: showtime.start_time, end_time: showtime.end_time, cinema_id: idOf(showtime.room_id.cinema_id), cinema_name: showtime.room_id.cinema_id?.name || "", cinema_address: showtime.room_id.cinema_id?.address || "", room_id: showtime.room_id._id, room_name: showtime.room_id.name },
          seat_items: items, subtotal_price: total, total_price: total, pricing: { ticket_subtotal: total, service_subtotal: 0, subtotal: total, discount: 0, total },
          status: "confirmed", payment_status: "paid", payment_provider: "cash", payment_transaction_id: `CASH-${bookingId.toString().slice(-8).toUpperCase()}`, paid_at: now,
        }], { session });
        await Payment.create([{ booking_id: booking._id, payment_code: `CASH-${booking.booking_code}`, provider: "cash", amount: total, status: "paid", transaction_ref: booking.payment_transaction_id, transaction_id: booking.payment_transaction_id, paid_at: now }], { session });
        const issued = await createTicketsForPaidBooking(booking._id, { session, includeQrPayloads: true });
        return { booking, tickets: issued.tickets, qrPayloads: issued.qrPayloads };
      } catch (error) {
        await Ticket.deleteMany({ bookingId }, { session });
        await Payment.deleteMany({ booking_id: bookingId }, { session });
        await Booking.deleteOne({ _id: bookingId }, { session });
        await ShowtimeSeat.updateMany({ _id: { $in: requestedSeatIds }, reserved_by_booking_id: bookingId, status: "booked" }, { $set: { status: "available", reserved_by_booking_id: null } }, { session });
        throw error;
      }
    });
    return res.status(201).json({ success: true, message: "Thanh toán tiền mặt thành công.", data: { booking_id: sale.booking._id, booking_code: sale.booking.booking_code, total_price: sale.booking.total_price, sales_channel: sale.booking.sales_channel, sold_by: sale.booking.sold_by, tickets: sale.tickets.map((ticket) => ({ id: ticket._id, code: ticket.ticketCode, seat: ticket.seatLabel, price: ticket.price })), ticket_qr_payloads: sale.qrPayloads } });
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
