import {
  createShowtimeSeatService,
  createShowtimeSeatsService,
  deleteShowtimeSeatService,
  getShowtimeSeatByIdService,
  listShowtimeSeats,
  updateShowtimeSeatService,
} from "../services/showtimeSeatService.js";

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message,
  });
};

export const getAllShowtimeSeats = async (req, res) => {
  try {
    const showtimeSeats = await listShowtimeSeats(req.query);

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
