import Room from "../models/Room.js";
import Seat from "../models/Seat.js";
import SeatType from "../models/SeatType.js";
import Showtime from "../models/Showtime.js";
import {
  bulkUpsertShowtimeSeats,
  createManyShowtimeSeats,
  createShowtimeSeat as createShowtimeSeatRecord,
  findAllShowtimeSeats,
  findOneShowtimeSeat,
  findShowtimeSeatById,
  findShowtimeSeatsByShowtimeId,
  softDeleteShowtimeSeatById,
  softDeleteShowtimeSeatsByShowtimeId,
  updateShowtimeSeatById,
} from "../repositories/showtimeSeatRepository.js";
import {
  normalizeShowtimeSeatPayload,
  parseShowtimeSeatStatus,
  validateShowtimeSeatPayload,
} from "../modules/showtimeSeats/showtimeSeat.validation.js";

const isMissing = (value) =>
  value === undefined || value === null || value === "";

const buildShowtimeSeatFilter = (query = {}) => {
  const { q, showtime_id, seat_id, status } = query;

  const filter = {
    deleted_at: null,
  };

  if (showtime_id) {
    filter.showtime_id = showtime_id;
  }

  if (seat_id) {
    filter.seat_id = seat_id;
  }

  if (!isMissing(status)) {
    filter.status = String(status).trim();
  }

  return { filter, q: q?.trim() ?? "" };
};

const resolveDefaultPrice = async ({ showtime, seat, price }) => {
  if (!isMissing(price)) {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      const error = new Error("price khong hop le");
      error.statusCode = 400;
      throw error;
    }

    return numericPrice;
  }

  const seatType =
    seat.seat_type_id && typeof seat.seat_type_id === "object"
      ? seat.seat_type_id
      : await SeatType.findById(seat.seat_type_id);

  if (!seatType) {
    const error = new Error("Khong tim thay seat type");
    error.statusCode = 404;
    throw error;
  }

  const basePrice = Number(showtime.base_price ?? 0);
  const multiplier = Number(seatType.price_multiplier ?? 1);
  const calculatedPrice = basePrice * multiplier;

  return calculatedPrice;
};

const assertShowtimeAndSeatAreCompatible = (showtime, seat) => {
  if (String(showtime.room_id) !== String(seat.room_id)) {
    const error = new Error("Seat khong thuoc room cua showtime");
    error.statusCode = 409;
    throw error;
  }
};

const loadShowtimeSeatRelations = async ({ showtime_id, seat_id }) => {
  const [showtime, seat] = await Promise.all([
    Showtime.findOne({
      _id: showtime_id,
      deleted_at: null,
    }),
    Seat.findOne({
      _id: seat_id,
      deleted_at: null,
    }).populate("seat_type_id", "name description price_multiplier"),
  ]);

  return { showtime, seat };
};

const buildDuplicateFilter = ({ showtime_id, seat_id, excludeId = null }) => {
  const filter = {
    deleted_at: null,
    showtime_id,
    seat_id,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return filter;
};

export const listShowtimeSeats = async (query = {}) => {
  const { filter, q } = buildShowtimeSeatFilter(query);
  let showtimeSeats = await findAllShowtimeSeats(filter, {
    sort: { created_at: -1 },
  });

  if (q) {
    const keyword = q.toLowerCase();

    showtimeSeats = showtimeSeats.filter((item) => {
      const status = item.status?.toLowerCase?.() ?? "";
      const price = String(item.price ?? "");
      const showtimeId = String(item.showtime_id ?? "");
      const seatId = String(item.seat_id ?? "");

      return (
        status.includes(keyword) ||
        price.includes(keyword) ||
        showtimeId.includes(keyword) ||
        seatId.includes(keyword)
      );
    });
  }

  return showtimeSeats;
};

export const getShowtimeSeatByIdService = async (id) => {
  return findShowtimeSeatById(id);
};

export const createShowtimeSeatService = async (payload) => {
  const normalizedPayload = normalizeShowtimeSeatPayload(payload, {
    status: "available",
  });

  const validationError = validateShowtimeSeatPayload(normalizedPayload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const { showtime, seat } = await loadShowtimeSeatRelations({
    showtime_id: normalizedPayload.showtime_id,
    seat_id: normalizedPayload.seat_id,
  });

  if (!showtime) {
    const error = new Error("Khong tim thay showtime");
    error.statusCode = 404;
    throw error;
  }

  if (!seat) {
    const error = new Error("Khong tim thay seat");
    error.statusCode = 404;
    throw error;
  }

  assertShowtimeAndSeatAreCompatible(showtime, seat);

  const existingShowtimeSeat = await findOneShowtimeSeat(
    buildDuplicateFilter({
      showtime_id: normalizedPayload.showtime_id,
      seat_id: normalizedPayload.seat_id,
    }),
  );

  if (existingShowtimeSeat) {
    const error = new Error("Showtime seat da ton tai");
    error.statusCode = 409;
    throw error;
  }

  const resolvedPrice = await resolveDefaultPrice({
    showtime,
    seat,
    price: normalizedPayload.price,
  });

  const createdShowtimeSeat = await createShowtimeSeatRecord({
    showtime_id: normalizedPayload.showtime_id,
    seat_id: normalizedPayload.seat_id,
    price: resolvedPrice,
    status: parseShowtimeSeatStatus(normalizedPayload.status, "available"),
  });

  return findShowtimeSeatById(createdShowtimeSeat._id);
};

export const createShowtimeSeatsService = async (payloads = []) => {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    const error = new Error("Danh sach showtime seat khong duoc rong");
    error.statusCode = 400;
    throw error;
  }

  const normalizedPayloads = payloads.map((payload) =>
    normalizeShowtimeSeatPayload(payload, {
      status: "available",
    }),
  );

  for (let i = 0; i < normalizedPayloads.length; i += 1) {
    const validationError = validateShowtimeSeatPayload(
      normalizedPayloads[i],
      i,
    );
    if (validationError) {
      const error = new Error(validationError);
      error.statusCode = 400;
      throw error;
    }
  }

  const seenKeys = new Set();
  for (const payload of normalizedPayloads) {
    const key = `${payload.showtime_id}:${payload.seat_id}`;
    if (seenKeys.has(key)) {
      const error = new Error("Danh sach showtime seat co du lieu trung nhau");
      error.statusCode = 409;
      throw error;
    }
    seenKeys.add(key);
  }

  const relationPairs = await Promise.all(
    normalizedPayloads.map((payload) => loadShowtimeSeatRelations(payload)),
  );

  for (let i = 0; i < relationPairs.length; i += 1) {
    const { showtime, seat } = relationPairs[i];
    const payload = normalizedPayloads[i];

    if (!showtime) {
      const error = new Error("Khong tim thay showtime");
      error.statusCode = 404;
      throw error;
    }

    if (!seat) {
      const error = new Error("Khong tim thay seat");
      error.statusCode = 404;
      throw error;
    }

    assertShowtimeAndSeatAreCompatible(showtime, seat);
    payload.price = await resolveDefaultPrice({
      showtime,
      seat,
      price: payload.price,
    });
    payload.status = parseShowtimeSeatStatus(payload.status, "available");
  }

  const duplicatesInDb = await Promise.all(
    normalizedPayloads.map((payload) =>
      findOneShowtimeSeat(
        buildDuplicateFilter({
          showtime_id: payload.showtime_id,
          seat_id: payload.seat_id,
        }),
      ),
    ),
  );

  const duplicateIndex = duplicatesInDb.findIndex(Boolean);
  if (duplicateIndex !== -1) {
    const error = new Error("Showtime seat da ton tai");
    error.statusCode = 409;
    throw error;
  }

  const createdShowtimeSeats =
    await createManyShowtimeSeats(normalizedPayloads);

  return Promise.all(
    createdShowtimeSeats.map((item) => findShowtimeSeatById(item._id)),
  );
};

export const generateShowtimeSeatsForShowtimeService = async (showtimeId) => {
  const showtime = await Showtime.findOne({
    _id: showtimeId,
    deleted_at: null,
  });

  if (!showtime) {
    const error = new Error("Khong tim thay showtime");
    error.statusCode = 404;
    throw error;
  }

  const seats = await Seat.find({
    room_id: showtime.room_id,
    deleted_at: null,
  })
    .populate("seat_type_id", "name description price_multiplier")
    .select("_id room_id seat_type_id");

  if (!seats.length) {
    return {
      upsertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
    };
  }

  const operations = await Promise.all(
    seats.map(async (seat) => {
      const price = await resolveDefaultPrice({
        showtime,
        seat,
        price: null,
      });

      return {
        updateOne: {
          filter: {
            showtime_id: showtime._id,
            seat_id: seat._id,
            deleted_at: null,
          },
          update: {
            $setOnInsert: {
              showtime_id: showtime._id,
              seat_id: seat._id,
              status: "available",
            },
            $set: {
              price,
            },
          },
          upsert: true,
        },
      };
    }),
  );

  const result = await bulkUpsertShowtimeSeats(operations);

  return {
    upsertedCount: result.upsertedCount ?? 0,
    matchedCount: result.matchedCount ?? 0,
    modifiedCount: result.modifiedCount ?? 0,
  };
};

export const countShowtimeSeatsForShowtimeService = async (showtimeId) => {
  const seats = await findShowtimeSeatsByShowtimeId(showtimeId, {
    populate: false,
  });

  return seats.length;
};

export const updateShowtimeSeatService = async (id, payload) => {
  const existingShowtimeSeat = await findShowtimeSeatById(id);

  if (!existingShowtimeSeat) {
    const error = new Error("Khong tim thay showtime seat");
    error.statusCode = 404;
    throw error;
  }

  const nextShowtimeId =
    payload.showtime_id ?? existingShowtimeSeat.showtime_id;
  const nextSeatId = payload.seat_id ?? existingShowtimeSeat.seat_id;
  const nextPrice = payload.price ?? existingShowtimeSeat.price;
  const nextStatus = payload.status ?? existingShowtimeSeat.status;

  const normalizedPayload = {
    showtime_id: nextShowtimeId,
    seat_id: nextSeatId,
    price: nextPrice,
    status: nextStatus,
  };

  const validationError = validateShowtimeSeatPayload(normalizedPayload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const { showtime, seat } = await loadShowtimeSeatRelations({
    showtime_id: normalizedPayload.showtime_id,
    seat_id: normalizedPayload.seat_id,
  });

  if (!showtime) {
    const error = new Error("Khong tim thay showtime");
    error.statusCode = 404;
    throw error;
  }

  if (!seat) {
    const error = new Error("Khong tim thay seat");
    error.statusCode = 404;
    throw error;
  }

  assertShowtimeAndSeatAreCompatible(showtime, seat);

  const duplicateShowtimeSeat = await findOneShowtimeSeat(
    buildDuplicateFilter({
      showtime_id: normalizedPayload.showtime_id,
      seat_id: normalizedPayload.seat_id,
      excludeId: id,
    }),
  );

  if (duplicateShowtimeSeat) {
    const error = new Error("Showtime seat da ton tai");
    error.statusCode = 409;
    throw error;
  }

  const resolvedPrice = await resolveDefaultPrice({
    showtime,
    seat,
    price: normalizedPayload.price,
  });

  const updatedShowtimeSeat = await updateShowtimeSeatById(
    id,
    {
      showtime_id: normalizedPayload.showtime_id,
      seat_id: normalizedPayload.seat_id,
      price: resolvedPrice,
      status: parseShowtimeSeatStatus(
        normalizedPayload.status,
        existingShowtimeSeat.status,
      ),
    },
    {
      populate: false,
    },
  );

  return findShowtimeSeatById(updatedShowtimeSeat._id);
};

export const deleteShowtimeSeatService = async (id) => {
  const existingShowtimeSeat = await findShowtimeSeatById(id);

  if (!existingShowtimeSeat) {
    const error = new Error("Khong tim thay showtime seat");
    error.statusCode = 404;
    throw error;
  }

  return softDeleteShowtimeSeatById(id);
};

export const deleteShowtimeSeatsForShowtimeService = async (showtimeId) => {
  if (!showtimeId) {
    return { deletedCount: 0 };
  }

  return softDeleteShowtimeSeatsByShowtimeId(showtimeId);
};
