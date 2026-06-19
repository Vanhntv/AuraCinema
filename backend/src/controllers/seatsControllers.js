import Room from "../models/Room.js";
import Seat from "../models/Seat.js";
import SeatType from "../models/SeatType.js";

const buildSeatFilter = (query) => {
  const { q, room_id, seat_type_id, status } = query;

  const filter = {
    deleted_at: null,
  };

  if (room_id) {
    filter.room_id = room_id;
  }

  if (seat_type_id) {
    filter.seat_type_id = seat_type_id;
  }

  if (status !== undefined) {
    if (status === "true" || status === true) {
      filter.status = true;
    } else if (status === "false" || status === false) {
      filter.status = false;
    }
  }

  if (q) {
    filter.$or = [
      { seat_row: { $regex: q, $options: "i" } },
      { seat_number: Number.isNaN(Number(q)) ? undefined : Number(q) },
    ].filter(Boolean);
  }

  return filter;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return fallback;
};

const normalizeSeatPayload = (payload, defaults = {}) => {
  return {
    room_id: payload.room_id ?? defaults.room_id,
    seat_type_id: payload.seat_type_id ?? defaults.seat_type_id,
    seat_row: payload.seat_row ?? defaults.seat_row,
    seat_number: payload.seat_number ?? defaults.seat_number,
    status: payload.status ?? defaults.status,
  };
};

const validateSeatPayload = (seat, index = null) => {
  const prefix = index === null ? "" : `Seat ${index + 1}: `;

  if (!seat.room_id) {
    return `${prefix}room_id la bat buoc`;
  }

  if (!seat.seat_type_id) {
    return `${prefix}seat_type_id la bat buoc`;
  }

  if (!seat.seat_row) {
    return `${prefix}seat_row la bat buoc`;
  }

  if (seat.seat_number === undefined || seat.seat_number === null || seat.seat_number === "") {
    return `${prefix}seat_number la bat buoc`;
  }

  return null;
};

export const getAllSeats = async (req, res) => {
  try {
    const filter = buildSeatFilter(req.query);

    const seats = await Seat.find(filter)
      .populate("room_id", "name capacity cinema_id")
      .populate("seat_type_id", "name description price_multiplier")
      .sort({ seat_row: 1, seat_number: 1, created_at: -1 });

    res.status(200).json({
      success: true,
      data: seats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSeatById = async (req, res) => {
  try {
    const { id } = req.params;

    const seat = await Seat.findOne({
      _id: id,
      deleted_at: null,
    })
      .populate("room_id", "name capacity cinema_id")
      .populate("seat_type_id", "name description price_multiplier");

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay seat",
      });
    }

    res.status(200).json({
      success: true,
      data: seat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSeatsByRoom = async (req, res) => {
  try {
    const room_id = req.params.room_id || req.query.room_id;
    const { q, seat_type_id, status } = req.query;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: "room_id la bat buoc",
      });
    }

    const filter = buildSeatFilter({
      q,
      room_id,
      seat_type_id,
      status,
    });

    const seats = await Seat.find(filter)
      .populate("room_id", "name capacity cinema_id")
      .populate("seat_type_id", "name description price_multiplier")
      .sort({ seat_row: 1, seat_number: 1 });

    res.status(200).json({
      success: true,
      data: seats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createSeat = async (req, res) => {
  try {
    const isBulkCreate = Array.isArray(req.body.seats);
    const rawSeats = isBulkCreate ? req.body.seats : [req.body];

    const normalizedSeats = rawSeats.map((seat) =>
      normalizeSeatPayload(seat, {
        room_id: req.body.room_id,
        seat_type_id: req.body.seat_type_id,
        status: req.body.status,
      })
    );

    if (normalizedSeats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sach seat khong duoc rong",
      });
    }

    for (let i = 0; i < normalizedSeats.length; i += 1) {
      const validationError = validateSeatPayload(normalizedSeats[i], isBulkCreate ? i : null);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    const roomIds = [...new Set(normalizedSeats.map((seat) => seat.room_id.toString()))];
    const seatTypeIds = [...new Set(normalizedSeats.map((seat) => seat.seat_type_id.toString()))];

    const rooms = await Room.find({
      _id: { $in: roomIds },
      deleted_at: null,
    });

    if (rooms.length !== roomIds.length) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    const seatTypes = await SeatType.find({
      _id: { $in: seatTypeIds },
    });

    if (seatTypes.length !== seatTypeIds.length) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay seat type",
      });
    }

    const preparedSeats = normalizedSeats.map((seat) => ({
      room_id: seat.room_id,
      seat_type_id: seat.seat_type_id,
      seat_row: String(seat.seat_row).trim(),
      seat_number: Number(seat.seat_number),
      status: parseBoolean(seat.status, true),
    }));

    const seenKeys = new Set();
    for (const seat of preparedSeats) {
      const key = `${seat.room_id}:${seat.seat_row}:${seat.seat_number}`;
      if (seenKeys.has(key)) {
        return res.status(409).json({
          success: false,
          message: "Danh sach seat co du lieu trung nhau",
        });
      }
      seenKeys.add(key);
    }

    const existingSeats = await Seat.find({
      deleted_at: null,
      $or: preparedSeats.map((seat) => ({
        room_id: seat.room_id,
        seat_row: seat.seat_row,
        seat_number: seat.seat_number,
      })),
    });

    if (existingSeats.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Seat da ton tai trong room nay",
      });
    }

    if (!isBulkCreate) {
      const [singleSeat] = preparedSeats;
      const seat = await Seat.create(singleSeat);

      await seat.populate("room_id", "name capacity cinema_id");
      await seat.populate("seat_type_id", "name description price_multiplier");

      return res.status(201).json({
        success: true,
        message: "Them seat thanh cong",
        data: seat,
      });
    }

    const createdSeats = await Seat.insertMany(preparedSeats);

    await Seat.populate(createdSeats, [
      { path: "room_id", select: "name capacity cinema_id" },
      { path: "seat_type_id", select: "name description price_multiplier" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Them seats thanh cong",
      data: createdSeats,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Seat da ton tai trong room nay",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, seat_type_id, seat_row, seat_number, status } = req.body;

    if (
      room_id === undefined &&
      seat_type_id === undefined &&
      seat_row === undefined &&
      seat_number === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Khong co du lieu can cap nhat",
      });
    }

    const seat = await Seat.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay seat",
      });
    }

    if (room_id !== undefined) {
      const room = await Room.findOne({
        _id: room_id,
        deleted_at: null,
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay room",
        });
      }

      seat.room_id = room_id;
    }

    if (seat_type_id !== undefined) {
      const seatType = await SeatType.findById(seat_type_id);

      if (!seatType) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay seat type",
        });
      }

      seat.seat_type_id = seat_type_id;
    }

    if (seat_row !== undefined) {
      const normalizedSeatRow = String(seat_row).trim();

      if (!normalizedSeatRow) {
        return res.status(400).json({
          success: false,
          message: "seat_row la bat buoc",
        });
      }

      seat.seat_row = normalizedSeatRow;
    }

    if (seat_number !== undefined) {
      const normalizedSeatNumber = Number(seat_number);

      if (Number.isNaN(normalizedSeatNumber)) {
        return res.status(400).json({
          success: false,
          message: "seat_number khong hop le",
        });
      }

      seat.seat_number = normalizedSeatNumber;
    }

    if (status !== undefined) {
      seat.status = parseBoolean(status, seat.status);
    }

    const duplicateSeat = await Seat.findOne({
      _id: { $ne: id },
      room_id: seat.room_id,
      seat_row: seat.seat_row,
      seat_number: seat.seat_number,
      deleted_at: null,
    });

    if (duplicateSeat) {
      return res.status(409).json({
        success: false,
        message: "Seat da ton tai trong room nay",
      });
    }

    await seat.save();
    await seat.populate("room_id", "name capacity cinema_id");
    await seat.populate("seat_type_id", "name description price_multiplier");

    res.status(200).json({
      success: true,
      message: "Cap nhat seat thanh cong",
      data: seat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSeat = async (req, res) => {
  try {
    const { id } = req.params;

    const seat = await Seat.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay seat",
      });
    }

    seat.deleted_at = new Date();
    await seat.save();

    res.status(200).json({
      success: true,
      message: "Xoa seat thanh cong",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
