import { randomBytes } from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookedSeat from "../models/BookedSeat.js";
import Seat from "../models/Seat.js";
import SeatType from "../models/SeatType.js";
import Showtime from "../models/Showtime.js";

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const code = () => `AURA-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

async function ensureSeats(roomId) {
  let seats = await Seat.find({ room_id: roomId, deleted_at: null, status: true }).populate("seat_type_id", "name price_multiplier").sort({ seat_row: 1, seat_number: 1 });
  if (seats.length) return seats;
  let seatType = await SeatType.findOne({ name: "Ghế thường" });
  if (!seatType) seatType = await SeatType.create({ name: "Ghế thường", description: "Ghế tiêu chuẩn", price_multiplier: 1 });
  const data = Array.from({ length: 60 }, (_, index) => ({ room_id: roomId, seat_type_id: seatType._id, seat_row: String.fromCharCode(65 + Math.floor(index / 10)), seat_number: index % 10 + 1 }));
  try { await Seat.insertMany(data); } catch (error) { if (error?.code !== 11000) throw error; }
  return Seat.find({ room_id: roomId, deleted_at: null, status: true }).populate("seat_type_id", "name price_multiplier").sort({ seat_row: 1, seat_number: 1 });
}

export const availability = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    if (!validId(showtime_id)) return res.status(400).json({ success: false, message: "Suất chiếu không hợp lệ" });
    const showtime = await Showtime.findOne({ _id: showtime_id, deleted_at: null });
    if (!showtime) return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    const [seats, locks, legacyBookings] = await Promise.all([
      ensureSeats(showtime.room_id),
      BookedSeat.find({ showtime_id }).select("seat_id"),
      Booking.find({ showtime_id, status: "confirmed" }).select("seat_ids"),
    ]);
    const bookedSeatIds = [...new Set([
      ...locks.map((item) => String(item.seat_id)),
      ...legacyBookings.flatMap((item) => item.seat_ids.map(String)),
    ])];
    return res.json({ success: true, data: { seats, bookedSeatIds } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

export const createBooking = async (req, res) => {
  try {
    const { showtime_id, seat_ids, customer_name, customer_phone } = req.body;
    const ids = [...new Set(Array.isArray(seat_ids) ? seat_ids.map(String) : [])];
    const phone = String(customer_phone || "").replace(/[\s.-]/g, "");
    if (!validId(showtime_id) || !ids.length || ids.some((id) => !validId(id))) return res.status(400).json({ success: false, message: "Vui lòng chọn suất chiếu và ghế" });
    if (!String(customer_name || "").trim() || !/^(?:\+?84|0)\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Họ tên hoặc số điện thoại không hợp lệ" });
    const showtime = await Showtime.findOne({ _id: showtime_id, deleted_at: null });
    if (!showtime) return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    if (showtime.start_time <= new Date()) return res.status(400).json({ success: false, message: "Suất chiếu đã bắt đầu" });
    const seats = await Seat.find({ _id: { $in: ids }, room_id: showtime.room_id, deleted_at: null, status: true }).populate("seat_type_id", "price_multiplier");
    if (seats.length !== ids.length) return res.status(400).json({ success: false, message: "Ghế không hợp lệ" });
    const base = Number(showtime.base_price || 0);
    if (base <= 0) return res.status(400).json({ success: false, message: "Suất chiếu chưa có giá vé" });
    const conflict = await Booking.exists({ showtime_id, status: "confirmed", seat_ids: { $in: ids } });
    if (conflict) return res.status(409).json({ success: false, message: "Ghế vừa được người khác đặt" });
    const snapshots = seats.map((seat) => ({ seat_id: seat._id, label: `${seat.seat_row}${seat.seat_number}`, price: Math.round(base * Number(seat.seat_type_id?.price_multiplier || 1)) }));
    let locks = [];
    try {
      locks = await BookedSeat.insertMany(ids.map((seat_id) => ({ showtime_id, seat_id })), { ordered: true });
      const booking = await Booking.create({ booking_code: code(), showtime_id, seat_ids: seats.map((seat) => seat._id), seats: snapshots, customer_name: String(customer_name).trim(), customer_phone: phone, total_price: snapshots.reduce((sum, seat) => sum + seat.price, 0) });
      await BookedSeat.updateMany({ _id: { $in: locks.map((lock) => lock._id) } }, { booking_id: booking._id });
      return res.status(201).json({ success: true, message: "Đặt vé thành công", data: booking });
    } catch (error) {
      if (locks.length) await BookedSeat.deleteMany({ _id: { $in: locks.map((lock) => lock._id) } });
      await BookedSeat.deleteMany({ showtime_id, seat_id: { $in: ids }, booking_id: null });
      throw error;
    }
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Ghế vừa được người khác đặt" });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const withDetails = (query) => query.populate({ path: "showtime_id", select: "movie_id room_id start_time end_time", populate: [
  { path: "movie_id", select: "title poster" },
  { path: "room_id", select: "name cinema_id", populate: { path: "cinema_id", select: "name" } },
] });

export const getBookings = async (req, res) => {
  try {
    const { status, payment_status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;
    if (q) filter.$or = ["booking_code", "customer_name", "customer_phone"].map((field) => ({ [field]: { $regex: q, $options: "i" } }));
    return res.json({ success: true, data: await withDetails(Booking.find(filter).sort({ created_at: -1 })) });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Không tìm thấy vé" });
    const { status, payment_status } = req.body;
    if (status !== undefined) {
      if (!["confirmed", "cancelled"].includes(status)) return res.status(400).json({ success: false, message: "Trạng thái vé không hợp lệ" });
      if (booking.status !== status && status === "cancelled") {
        await BookedSeat.deleteMany({ booking_id: booking._id });
      }
      if (booking.status !== status && status === "confirmed") {
        await BookedSeat.insertMany(booking.seat_ids.map((seat_id) => ({ booking_id: booking._id, showtime_id: booking.showtime_id, seat_id })));
      }
      booking.status = status;
    }
    if (payment_status !== undefined) {
      if (!["pending", "paid"].includes(payment_status)) return res.status(400).json({ success: false, message: "Trạng thái thanh toán không hợp lệ" });
      booking.payment_status = payment_status;
    }
    await booking.save();
    return res.json({ success: true, message: "Cập nhật vé thành công", data: await withDetails(Booking.findById(booking._id)) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Ghế của vé này đã được người khác đặt" });
    return res.status(500).json({ success: false, message: error.message });
  }
};
