import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Showtime from "../models/Showtime.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import User from "../models/User.js";

const seatTypeName = (seat) => String(seat.seat_id?.seat_type_id?.name || "").trim().toLowerCase();

export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { showtime_id, showtime_seat_ids } = req.body;
    if (!showtime_id || !Array.isArray(showtime_seat_ids) || !showtime_seat_ids.length) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn suất chiếu và ghế" });
    }

    let createdBooking;
    await session.withTransaction(async () => {
      const [user, showtime, seats] = await Promise.all([
        User.findOne({ _id: req.user.id, deleted_at: null, status: true }).session(session),
        Showtime.findOne({ _id: showtime_id, deleted_at: null }).session(session),
        ShowtimeSeat.find({
          _id: { $in: showtime_seat_ids },
          showtime_id,
          deleted_at: null,
          status: "held",
          held_by: req.user.id,
          hold_expires_at: { $gt: new Date() },
        }).populate({ path: "seat_id", populate: { path: "seat_type_id", select: "name" } }).session(session),
      ]);

      if (!user) throw Object.assign(new Error("Không tìm thấy tài khoản"), { statusCode: 404 });
      if (!showtime) throw Object.assign(new Error("Không tìm thấy suất chiếu"), { statusCode: 404 });
      if (seats.length !== new Set(showtime_seat_ids.map(String)).size) {
        throw Object.assign(new Error("Một hoặc nhiều ghế đã được đặt"), { statusCode: 409 });
      }

      const types = new Set(seats.map(seatTypeName));
      if (types.size > 1) throw Object.assign(new Error("Không thể đặt nhiều loại ghế cùng lúc"), { statusCode: 400 });

      const updateResult = await ShowtimeSeat.updateMany(
        { _id: { $in: seats.map((seat) => seat._id) }, status: "held", held_by: req.user.id },
        { $set: { status: "booked", held_by: null, hold_expires_at: null } },
        { session },
      );
      if (updateResult.modifiedCount !== seats.length) {
        throw Object.assign(new Error("Ghế vừa được người khác đặt"), { statusCode: 409 });
      }

      const totalPrice = seats.reduce((total, seat) => total + Number(seat.price), 0);
      [createdBooking] = await Booking.create([{
        user_id: user._id,
        showtime_id,
        showtime_seat_ids: seats.map((seat) => seat._id),
        customer_name: user.full_name,
        customer_email: user.email,
        customer_phone: user.phone,
        total_price: totalPrice,
      }], { session });
    });

    return res.status(201).json({ success: true, message: "Đặt vé thành công", data: createdBooking });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.user.id })
      .populate({
        path: "showtime_id",
        select: "movie_id room_id start_time end_time",
        populate: [
          { path: "movie_id", select: "title poster duration age_limit" },
          {
            path: "room_id",
            select: "name cinema_id",
            populate: { path: "cinema_id", select: "name address city" },
          },
        ],
      })
      .populate({
        path: "showtime_seat_ids",
        populate: {
          path: "seat_id",
          select: "seat_row seat_number seat_type_id",
          populate: { path: "seat_type_id", select: "name" },
        },
      })
      .sort({ created_at: -1 });
    return res.json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
