import {
  createShowtimeSeatService,
  createShowtimeSeatsService,
  deleteShowtimeSeatService,
  getShowtimeSeatByIdService,
  generateShowtimeSeatsForShowtimeService,
  listShowtimeSeats,
  updateShowtimeSeatService,
} from "../services/showtimeSeatService.js";
import Booking from "../models/Booking.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import {
  acquireSeatHold,
  expireSeatHolds,
  getActiveSeatHold,
  releaseSeatHold,
} from "../services/seatHoldService.js";

const releaseFailedPaymentReservedSeats = async (showtimeId) => {
  if (!showtimeId) return;

  const failedBookings = await Booking.find({
    showtime_id: showtimeId,
    status: { $in: ["pending", "cancelled"] },
    payment_status: { $in: ["failed", "cancelled"] },
    showtime_seat_ids: { $exists: true, $ne: [] },
  }).select("showtime_seat_ids");

  if (!failedBookings.length) return;

  await Promise.all(failedBookings.map((booking) =>
    ShowtimeSeat.updateMany(
      {
        _id: { $in: booking.showtime_seat_ids || [] },
        status: "reserved",
        reserved_by_booking_id: booking._id,
      },
      {
        $set: {
          status: "available",
          held_by: null,
          reserved_by_booking_id: null,
          hold_expires_at: null,
        },
      },
    ),
  ));
};

export const holdShowtimeSeats = async (req, res) => {
  try {
    const result = await acquireSeatHold({
      userId: req.user.id,
      showtimeId: req.body?.showtime_id,
      seatIds: req.body?.showtime_seat_ids,
      token: String(req.body?.hold_token || "").trim(),
    });

    return res.json({ success: true, data: result });
  } catch (error) { return sendError(res, error); }
};

export const getActiveShowtimeSeatHold = async (req, res) => {
  try {
    const showtimeId = String(req.query?.showtime_id || "").trim();
    if (!showtimeId) {
      return res.status(400).json({ success: false, message: "Thiếu suất chiếu" });
    }

    const hold = await getActiveSeatHold({
      userId: req.user.id,
      showtimeId,
      token: String(req.query?.hold_token || "").trim(),
    });

    return res.json({
      success: true,
      data: hold ? {
        hold_id: hold._id,
        hold_token: hold.token,
        showtime_id: hold.showtime_id,
        showtime_seat_ids: hold.showtime_seat_ids || [],
        expires_at: hold.expires_at,
      } : null,
    });
  } catch (error) { return sendError(res, error); }
};

export const releaseShowtimeSeats = async (req, res) => {
  try {
    const { showtime_id, showtime_seat_ids = [], hold_token = "" } = req.body || {};

    if (!showtime_id) {
      await ShowtimeSeat.updateMany(
        { _id: { $in: showtime_seat_ids }, status: "held", held_by: req.user.id, hold_id: null },
        { $set: { status: "available", held_by: null, hold_id: null, reserved_by_booking_id: null, hold_expires_at: null } },
      );
      return res.json({ success: true, data: { released: true, showtime_seat_ids: [] } });
    }

    const result = await releaseSeatHold({
      userId: req.user.id,
      showtimeId: showtime_id,
      token: String(hold_token || "").trim(),
      seatIds: showtime_seat_ids,
    });
    return res.json({ success: true, data: result });
  } catch (error) { return sendError(res, error); }
};

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message,
  });
};

export const getAllShowtimeSeats = async (req, res) => {
  try {
    await expireSeatHolds({ showtimeId: req.query.showtime_id });
    await ShowtimeSeat.updateMany(
      { status: "held", hold_id: null, hold_expires_at: { $lte: new Date() } },
      { $set: { status: "available", held_by: null, hold_id: null, reserved_by_booking_id: null, hold_expires_at: null } },
    );
    await releaseFailedPaymentReservedSeats(req.query.showtime_id);
    let showtimeSeats = await listShowtimeSeats(req.query);

    if (req.query.showtime_id && showtimeSeats.length === 0) {
      await generateShowtimeSeatsForShowtimeService(req.query.showtime_id);
      showtimeSeats = await listShowtimeSeats(req.query);
    }

    if (req.query.showtime_id && showtimeSeats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Phòng chiếu chưa được cấu hình ghế",
      });
    }

    res.status(200).json({
      success: true,
      data: showtimeSeats,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getShowtimeSeatById = async (req, res) => {
  try {
    const { id } = req.params;
    const showtimeSeat = await getShowtimeSeatByIdService(id);

    if (!showtimeSeat) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay showtime seat",
      });
    }

    res.status(200).json({
      success: true,
      data: showtimeSeat,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createShowtimeSeat = async (req, res) => {
  try {
    if (Array.isArray(req.body.showtime_seats)) {
      const createdShowtimeSeats = await createShowtimeSeatsService(req.body.showtime_seats);

      return res.status(201).json({
        success: true,
        message: "Them showtime seats thanh cong",
        data: createdShowtimeSeats,
      });
    }

    const createdShowtimeSeat = await createShowtimeSeatService(req.body);

    res.status(201).json({
      success: true,
      message: "Them showtime seat thanh cong",
      data: createdShowtimeSeat,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateShowtimeSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedShowtimeSeat = await updateShowtimeSeatService(id, req.body);

    res.status(200).json({
      success: true,
      message: "Cap nhat showtime seat thanh cong",
      data: updatedShowtimeSeat,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteShowtimeSeat = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteShowtimeSeatService(id);

    res.status(200).json({
      success: true,
      message: "Xoa showtime seat thanh cong",
    });
  } catch (error) {
    sendError(res, error);
  }
};
