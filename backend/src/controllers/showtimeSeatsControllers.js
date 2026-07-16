import {
  createShowtimeSeatService,
  createShowtimeSeatsService,
  deleteShowtimeSeatService,
  getShowtimeSeatByIdService,
  generateShowtimeSeatsForShowtimeService,
  listShowtimeSeats,
  updateShowtimeSeatService,
} from "../services/showtimeSeatService.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";

const HOLD_DURATION_MS = 5 * 60 * 1000;

export const holdShowtimeSeats = async (req, res) => {
  try {
    const { showtime_id, showtime_seat_ids } = req.body;
    if (!showtime_id || !Array.isArray(showtime_seat_ids) || !showtime_seat_ids.length) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ghế cần giữ" });
    }
    const now = new Date();
    await ShowtimeSeat.updateMany(
      { status: "held", hold_expires_at: { $lte: now } },
      { $set: { status: "available", held_by: null, hold_expires_at: null } },
    );
    const seats = await ShowtimeSeat.find({ _id: { $in: showtime_seat_ids }, showtime_id, deleted_at: null });
    const canHold = seats.length === new Set(showtime_seat_ids.map(String)).size && seats.every((seat) =>
      seat.status === "available" || (seat.status === "held" && String(seat.held_by) === String(req.user.id)),
    );
    if (!canHold) return res.status(409).json({ success: false, message: "Một hoặc nhiều ghế đang được người khác giữ" });
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);
    await ShowtimeSeat.updateMany(
      { _id: { $in: showtime_seat_ids } },
      { $set: { status: "held", held_by: req.user.id, hold_expires_at: expiresAt } },
    );
    return res.json({ success: true, data: { expires_at: expiresAt } });
  } catch (error) { return sendError(res, error); }
};

export const releaseShowtimeSeats = async (req, res) => {
  try {
    const { showtime_seat_ids = [] } = req.body;
    await ShowtimeSeat.updateMany(
      { _id: { $in: showtime_seat_ids }, status: "held", held_by: req.user.id },
      { $set: { status: "available", held_by: null, hold_expires_at: null } },
    );
    return res.json({ success: true });
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
    await ShowtimeSeat.updateMany(
      { status: "held", hold_expires_at: { $lte: new Date() } },
      { $set: { status: "available", held_by: null, hold_expires_at: null } },
    );
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
