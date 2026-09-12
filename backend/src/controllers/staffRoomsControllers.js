import mongoose from "mongoose";
import Room from "../models/Room.js";
import Seat from "../models/Seat.js";
import SeatHold from "../models/SeatHold.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import Showtime from "../models/Showtime.js";
import { getSeatOperationalStatus, SEAT_OPERATIONAL_STATUSES } from "../utils/seatStatus.js";

const getVietnamTodayRange = (now = new Date()) => {
  const localDay = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const [year, month, day] = localDay.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -7));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

const seatView = (seat) => ({
  ...seat.toObject(),
  operational_status: getSeatOperationalStatus(seat),
});

export const getStaffRooms = async (req, res) => {
  try {
    const now = new Date();
    const rooms = await Room.find({ deleted_at: null })
      .populate("cinema_id", "name city address")
      .sort({ name: 1 });

    const roomIds = rooms.map((room) => room._id);
    const { end } = getVietnamTodayRange(now);
    const [seats, showtimes] = roomIds.length
      ? await Promise.all([
          Seat.find({ room_id: { $in: roomIds }, deleted_at: null })
            .select("room_id status operational_status"),
          Showtime.find({
            room_id: { $in: roomIds },
            deleted_at: null,
            status: "scheduled",
            start_time: { $gt: now, $lt: end },
          })
            .populate("movie_id", "title duration poster")
            .sort({ start_time: 1 }),
        ])
      : [[], []];
    const summaryByRoom = new Map();
    const showtimesByRoom = new Map();

    for (const seat of seats) {
      const roomId = String(seat.room_id);
      const summary = summaryByRoom.get(roomId) || { total: 0, active: 0, maintenance: 0 };
      const status = getSeatOperationalStatus(seat);
      summary.total += 1;
      summary[status] += 1;
      summaryByRoom.set(roomId, summary);
    }

    for (const showtime of showtimes) {
      if (!showtime.movie_id) continue;
      const roomId = String(showtime.room_id);
      const items = showtimesByRoom.get(roomId) || [];
      items.push({
        id: showtime._id,
        start_time: showtime.start_time,
        end_time: showtime.end_time,
        status: showtime.status,
        movie: {
          id: showtime.movie_id._id,
          title: showtime.movie_id.title,
          duration: showtime.movie_id.duration,
          poster: showtime.movie_id.poster || "",
        },
      });
      showtimesByRoom.set(roomId, items);
    }

    return res.json({
      success: true,
      data: rooms.map((room) => ({
        ...room.toObject(),
        seat_summary: summaryByRoom.get(String(room._id)) || { total: 0, active: 0, maintenance: 0 },
        today_showtimes: showtimesByRoom.get(String(room._id)) || [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffRoomSeats = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.roomId)) {
      return res.status(400).json({ success: false, message: "Phòng không hợp lệ." });
    }

    const room = await Room.findOne({ _id: req.params.roomId, deleted_at: null })
      .populate("cinema_id", "name city address");
    if (!room) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng." });
    }

    const seats = await Seat.find({ room_id: room._id, deleted_at: null })
      .populate("seat_type_id", "name description price_multiplier")
      .sort({ seat_row: 1, seat_number: 1 });

    return res.json({
      success: true,
      data: { ...room.toObject(), seats: seats.map(seatView) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaffSeatStatus = async (req, res) => {
  const { roomId, seatId } = req.params;
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(seatId)) {
    return res.status(400).json({ success: false, message: "Phòng hoặc ghế không hợp lệ." });
  }
  if (!SEAT_OPERATIONAL_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Trạng thái ghế phải là active hoặc maintenance." });
  }

  try {
    const seat = await Seat.findOne({ _id: seatId, room_id: roomId, deleted_at: null });
    if (!seat) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ghế trong phòng." });
    }

    const showtimeSeatFilter = { seat_id: seat._id, deleted_at: null };
    let syncedCount = 0;

    if (status === "maintenance") {
      const heldSeats = await ShowtimeSeat.find({
        ...showtimeSeatFilter,
        status: "held",
      }).select("_id");
      const heldShowtimeSeatIds = heldSeats.map((item) => item._id);

      const syncResult = await ShowtimeSeat.updateMany(
        { ...showtimeSeatFilter, status: { $in: ["available", "held"] } },
        {
          $set: {
            status: "maintenance",
            held_by: null,
            hold_id: null,
            reserved_by_booking_id: null,
            hold_expires_at: null,
          },
        },
      );
      syncedCount = syncResult.modifiedCount || 0;

      if (heldShowtimeSeatIds.length) {
        await SeatHold.updateMany(
          { status: "active", showtime_seat_ids: { $in: heldShowtimeSeatIds } },
          { $pull: { showtime_seat_ids: { $in: heldShowtimeSeatIds } } },
        );
        await SeatHold.updateMany(
          { status: "active", showtime_seat_ids: { $size: 0 } },
          { $set: { status: "released", released_at: new Date() } },
        );
      }
    } else {
      const syncResult = await ShowtimeSeat.updateMany(
        { ...showtimeSeatFilter, status: "maintenance" },
        {
          $set: {
            status: "available",
            held_by: null,
            hold_id: null,
            reserved_by_booking_id: null,
            hold_expires_at: null,
          },
        },
      );
      syncedCount = syncResult.modifiedCount || 0;
    }

    seat.operational_status = status;
    seat.status = status === "active";
    await seat.save();
    await seat.populate("seat_type_id", "name description price_multiplier");

    return res.json({
      success: true,
      message: status === "maintenance"
        ? "Đã chuyển ghế sang bảo trì."
        : "Ghế đã sẵn sàng sử dụng.",
      data: { seat: seatView(seat), synced_showtime_seats: syncedCount },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
