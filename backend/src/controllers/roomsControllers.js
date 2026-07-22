import Booking from "../models/Booking.js";
import Cinema from "../models/Cinema.js";
import Room from "../models/Room.js";
import Seat from "../models/Seat.js";
import SeatType from "../models/SeatType.js";
import Showtime from "../models/Showtime.js";

const ROOM_STATUSES = ["active", "maintenance", "inactive"];
const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"];
const MAX_SEATS_PER_ROOM = 400;
const MAX_ROOM_ROWS = 26;

const normalizeName = (value) => String(value || "").trim();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInteger = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      const error = new Error(`${fieldName} la bat buoc`);
      error.statusCode = 400;
      throw error;
    }

    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    const error = new Error(`${fieldName} phai la so nguyen duong`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
};

const normalizeRoomType = (value) => {
  if (value === undefined || value === null || value === "") {
    return "2D";
  }

  const roomType = String(value).trim().toUpperCase();

  if (!ROOM_TYPES.includes(roomType)) {
    const error = new Error("room_type khong hop le");
    error.statusCode = 400;
    throw error;
  }

  return roomType;
};

const normalizeRoomStatus = (value, fallback = "active") => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const status = String(value).trim().toLowerCase();

  if (!ROOM_STATUSES.includes(status)) {
    const error = new Error("status khong hop le");
    error.statusCode = 400;
    throw error;
  }

  return status;
};

const normalizeSeatTypeName = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const resolveDefaultSeatType = async () => {
  const seatTypes = await SeatType.find();
  const defaultSeatType = seatTypes.find((seatType) => {
    const name = normalizeSeatTypeName(seatType.name);
    return name.includes("thuong") || name.includes("normal");
  });

  if (defaultSeatType) {
    return defaultSeatType;
  }

  return SeatType.create({
    name: "Thường",
    description: "Ghế thường mặc định",
    price_multiplier: 1,
  });
};

const buildSeatDocuments = ({ roomId, rowCount, columnCount, seatTypeId }) => {
  const seats = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const seatRow = String.fromCharCode(65 + rowIndex);

    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      seats.push({
        room_id: roomId,
        seat_type_id: seatTypeId,
        seat_row: seatRow,
        seat_number: columnIndex,
        seat_code: `${seatRow}${columnIndex}`,
        status: true,
      });
    }
  }

  return seats;
};

const populateRoom = async (room) => {
  await room.populate("cinema_id", "name city address");
  return room;
};

const getRoomSeats = async (roomId) =>
  Seat.find({
    room_id: roomId,
    deleted_at: null,
  })
    .populate("seat_type_id", "name description price_multiplier")
    .sort({ seat_row: 1, seat_number: 1 });

const ensureRoomNameIsUnique = async ({ cinemaId, name, excludeId = null }) => {
  const filter = {
    cinema_id: cinemaId,
    name: {
      $regex: `^${escapeRegex(name)}$`,
      $options: "i",
    },
    deleted_at: null,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const duplicateRoom = await Room.findOne(filter);

  if (duplicateRoom) {
    const error = new Error("Ten phong da ton tai trong rap nay");
    error.statusCode = 409;
    throw error;
  }
};

const getRoomShowtimeIds = async (roomId) => {
  const showtimes = await Showtime.find({
    room_id: roomId,
    deleted_at: null,
  }).select("_id start_time");

  return showtimes;
};

const getRoomUsage = async (roomId) => {
  const showtimes = await getRoomShowtimeIds(roomId);
  const showtimeIds = showtimes.map((showtime) => showtime._id);
  const now = new Date();

  const futureShowtimeCount = showtimes.filter(
    (showtime) => showtime.start_time >= now,
  ).length;

  const bookingCount = showtimeIds.length
    ? await Booking.countDocuments({
        showtime_id: { $in: showtimeIds },
        status: { $ne: "cancelled" },
      })
    : 0;

  return {
    showtimeCount: showtimes.length,
    futureShowtimeCount,
    bookingCount,
  };
};

const assertSeatMapCanChange = async (roomId) => {
  const usage = await getRoomUsage(roomId);

  if (usage.futureShowtimeCount > 0 || usage.bookingCount > 0) {
    const error = new Error(
      "Khong the thay doi so do ghe khi phong co suat chieu tuong lai hoac ve da ban",
    );
    error.statusCode = 409;
    throw error;
  }
};

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
  });
};

const applyStatusFilter = (filter, status) => {
  if (status === "active") {
    filter.$or = [
      ...(filter.$or || []),
      { status: "active" },
      { status: { $exists: false } },
    ];
    return;
  }

  filter.status = status;
};

export const getAllRooms = async (req, res) => {
  try {
    const { q, cinema_id, status, room_type, active_only } = req.query;
    const filter = {
      deleted_at: null,
    };

    if (cinema_id) {
      filter.cinema_id = cinema_id;
    }

    if (status) {
      applyStatusFilter(filter, normalizeRoomStatus(status));
    }

    if (active_only === "true" || active_only === true) {
      applyStatusFilter(filter, "active");
    }

    if (room_type) {
      filter.room_type = normalizeRoomType(room_type);
    }

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const rooms = await Room.find(filter)
      .populate("cinema_id", "name city address")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    }).populate("cinema_id", "name city address");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    const [seats, usage] = await Promise.all([
      getRoomSeats(room._id),
      getRoomUsage(room._id),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...room.toObject(),
        seats,
        usage,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getRoomsByCinema = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const { q, active_only } = req.query;

    const filter = {
      deleted_at: null,
      cinema_id,
    };

    if (active_only === "true" || active_only === true) {
      applyStatusFilter(filter, "active");
    }

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const rooms = await Room.find(filter)
      .populate("cinema_id", "name city address")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createRoom = async (req, res) => {
  let createdRoom = null;

  try {
    const {
      cinema_id,
      name,
      capacity,
      room_type,
      row_count,
      column_count,
      status,
    } = req.body;

    if (!cinema_id) {
      return res.status(400).json({
        success: false,
        message: "cinema_id la bat buoc",
      });
    }

    const normalizedName = normalizeName(name);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "name la bat buoc",
      });
    }

    const normalizedRoomType = normalizeRoomType(room_type);
    const normalizedStatus = normalizeRoomStatus(status, "active");
    const rowCount = parsePositiveInteger(row_count, "row_count", {
      required: true,
    });
    const columnCount = parsePositiveInteger(column_count, "column_count", {
      required: true,
    });
    const seatCapacity = rowCount * columnCount;

    if (rowCount > MAX_ROOM_ROWS) {
      return res.status(400).json({
        success: false,
        message: `So hang ghe khong duoc vuot qua ${MAX_ROOM_ROWS}`,
      });
    }

    if (seatCapacity > MAX_SEATS_PER_ROOM) {
      return res.status(400).json({
        success: false,
        message: `So ghe khong duoc vuot qua ${MAX_SEATS_PER_ROOM}`,
      });
    }

    const cinema = await Cinema.findOne({
      _id: cinema_id,
      deleted_at: null,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay cinema",
      });
    }

    await ensureRoomNameIsUnique({
      cinemaId: cinema_id,
      name: normalizedName,
    });

    const defaultSeatType = await resolveDefaultSeatType();

    createdRoom = await Room.create({
      cinema_id,
      name: normalizedName,
      room_type: normalizedRoomType,
      row_count: rowCount,
      column_count: columnCount,
      capacity:
        capacity !== undefined && capacity !== null && capacity !== ""
          ? Number(capacity)
          : seatCapacity,
      status: normalizedStatus,
    });

    await Seat.insertMany(
      buildSeatDocuments({
        roomId: createdRoom._id,
        rowCount,
        columnCount,
        seatTypeId: defaultSeatType._id,
      }),
    );

    await populateRoom(createdRoom);
    const seats = await getRoomSeats(createdRoom._id);

    res.status(201).json({
      success: true,
      message: "Them room thanh cong",
      data: {
        ...createdRoom.toObject(),
        seats,
      },
    });
  } catch (error) {
    if (createdRoom?._id) {
      await Promise.all([
        Seat.deleteMany({ room_id: createdRoom._id }),
        Room.deleteOne({ _id: createdRoom._id }),
      ]);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ten phong da ton tai trong rap nay",
      });
    }

    sendError(res, error);
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cinema_id,
      name,
      capacity,
      room_type,
      row_count,
      column_count,
      status,
    } = req.body;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    let nextCinemaId = room.cinema_id;

    if (cinema_id !== undefined) {
      const cinema = await Cinema.findOne({
        _id: cinema_id,
        deleted_at: null,
      });

      if (!cinema) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay cinema",
        });
      }

      nextCinemaId = cinema._id;
    }

    const nextName = name !== undefined ? normalizeName(name) : room.name;

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: "name la bat buoc",
      });
    }

    await ensureRoomNameIsUnique({
      cinemaId: nextCinemaId,
      name: nextName,
      excludeId: room._id,
    });

    const nextRowCount =
      row_count !== undefined
        ? parsePositiveInteger(row_count, "row_count")
        : room.row_count;
    const nextColumnCount =
      column_count !== undefined
        ? parsePositiveInteger(column_count, "column_count")
        : room.column_count;
    const isSeatMapChanging =
      row_count !== undefined || column_count !== undefined;

    if (isSeatMapChanging) {
      await assertSeatMapCanChange(room._id);

      if (!nextRowCount || !nextColumnCount) {
        return res.status(400).json({
          success: false,
          message: "row_count va column_count la bat buoc khi cap nhat so do ghe",
        });
      }

      if (nextRowCount * nextColumnCount > MAX_SEATS_PER_ROOM) {
        return res.status(400).json({
          success: false,
          message: `So ghe khong duoc vuot qua ${MAX_SEATS_PER_ROOM}`,
        });
      }

      if (nextRowCount > MAX_ROOM_ROWS) {
        return res.status(400).json({
          success: false,
          message: `So hang ghe khong duoc vuot qua ${MAX_ROOM_ROWS}`,
        });
      }
    }

    room.cinema_id = nextCinemaId;
    room.name = nextName;

    if (room_type !== undefined) {
      room.room_type = normalizeRoomType(room_type);
    }

    if (status !== undefined) {
      room.status = normalizeRoomStatus(status, room.status);
    }

    if (isSeatMapChanging) {
      const defaultSeatType = await resolveDefaultSeatType();
      room.row_count = nextRowCount;
      room.column_count = nextColumnCount;
      room.capacity = nextRowCount * nextColumnCount;

      await Seat.deleteMany({ room_id: room._id });
      await Seat.insertMany(
        buildSeatDocuments({
          roomId: room._id,
          rowCount: nextRowCount,
          columnCount: nextColumnCount,
          seatTypeId: defaultSeatType._id,
        }),
      );
    } else if (capacity !== undefined) {
      room.capacity =
        capacity !== null && capacity !== "" ? Number(capacity) : null;
    }

    await room.save();
    await populateRoom(room);
    const seats = await getRoomSeats(room._id);

    res.status(200).json({
      success: true,
      message: "Cap nhat room thanh cong",
      data: {
        ...room.toObject(),
        seats,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ten phong da ton tai trong rap nay",
      });
    }

    sendError(res, error);
  }
};

export const updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    room.status = normalizeRoomStatus(status);
    await room.save();
    await populateRoom(room);

    res.status(200).json({
      success: true,
      message: "Cap nhat trang thai room thanh cong",
      data: room,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    room.deleted_at = new Date();
    room.status = "inactive";
    await room.save();

    res.status(200).json({
      success: true,
      message: "Da khoa room thanh cong",
    });
  } catch (error) {
    sendError(res, error);
  }
};
