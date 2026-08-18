import { randomBytes } from "crypto";
import SeatHold from "../models/SeatHold.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import { isBrokenSeatType } from "../utils/seatTypes.js";
import {
  MAX_SEATS_PER_HOLD,
  createSeatHoldExpiry,
  isExpired,
  validateCoupleSeatSelection,
} from "./seatHoldPolicy.js";

const makeError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const applySession = (query, session) =>
  session && typeof query?.session === "function" ? query.session(session) : query;

const normalizeSeatIds = (seatIds = []) => {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw makeError("Vui lòng chọn ghế cần giữ", 400);
  }

  const ids = seatIds.map((seatId) => String(seatId || "").trim()).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw makeError("Danh sách ghế bị trùng lặp", 400);
  }
  if (ids.length > MAX_SEATS_PER_HOLD) {
    throw makeError(`Mỗi lần chỉ được giữ tối đa ${MAX_SEATS_PER_HOLD} ghế`, 400);
  }
  return ids;
};

const findActiveHold = async ({ userId, showtimeId, session }) =>
  applySession(SeatHold.findOne({
    user_id: userId,
    showtime_id: showtimeId,
    status: "active",
  }), session);

export const expireSeatHolds = async ({
  now = new Date(),
  showtimeId,
  userId,
  session = null,
  limit = 100,
} = {}) => {
  const filter = { status: "active", expires_at: { $lte: now } };
  if (showtimeId) filter.showtime_id = showtimeId;
  if (userId) filter.user_id = userId;

  let query = SeatHold.find(filter);
  if (typeof query.limit === "function") query = query.limit(limit);
  query = applySession(query, session);
  const expiredHolds = await query;
  let expiredCount = 0;

  for (const hold of expiredHolds) {
    await ShowtimeSeat.updateMany(
      { hold_id: hold._id, status: "held" },
      {
        $set: {
          status: "available",
          held_by: null,
          hold_id: null,
          reserved_by_booking_id: null,
          hold_expires_at: null,
        },
      },
      { session },
    );
    const result = await SeatHold.updateOne(
      { _id: hold._id, status: "active", expires_at: { $lte: now } },
      { $set: { status: "expired", released_at: now } },
      { session },
    );
    if (result.modifiedCount === 1) expiredCount += 1;
  }

  return expiredCount;
};

export const getActiveSeatHold = async ({
  userId,
  showtimeId,
  token,
  now = new Date(),
  session = null,
}) => {
  await expireSeatHolds({ now, showtimeId, userId, session });
  const hold = await findActiveHold({ userId, showtimeId, session });
  if (!hold || isExpired(hold.expires_at, now)) return null;
  if (token && hold.token !== token) {
    throw makeError("Phiên giữ ghế không khớp", 409);
  }
  return hold;
};

const createHold = async ({ userId, showtimeId, now, session }) => {
  const payload = {
    token: randomBytes(24).toString("hex"),
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: [],
    status: "active",
    expires_at: createSeatHoldExpiry(now),
  };

  try {
    const [hold] = await SeatHold.create([payload], { session });
    return hold;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return findActiveHold({ userId, showtimeId, session });
  }
};

const loadRequestedSeats = async ({ showtimeId, seatIds, session }) => {
  let query = ShowtimeSeat.find({
    _id: { $in: seatIds },
    showtime_id: showtimeId,
    deleted_at: null,
  });
  if (typeof query.populate === "function") {
    query = query.populate({
      path: "seat_id",
      populate: { path: "seat_type_id", select: "name description price_multiplier" },
    });
  }
  return applySession(query, session);
};

export const acquireSeatHold = async ({
  userId,
  showtimeId,
  seatIds,
  token = "",
  now = new Date(),
  session = null,
}) => {
  const normalizedSeatIds = normalizeSeatIds(seatIds);
  await expireSeatHolds({ now, showtimeId, userId, session });

  let hold = await findActiveHold({ userId, showtimeId, session });
  if (hold && token && hold.token !== token) {
    throw makeError("Phiên giữ ghế không khớp", 409);
  }
  if (hold && !token && (hold.showtime_seat_ids || []).length > 0) {
    throw makeError("Bạn đã có phiên giữ ghế đang hoạt động. Vui lòng khôi phục phiên giữ ghế.", 409);
  }
  if (!hold) hold = await createHold({ userId, showtimeId, now, session });
  if (!hold || isExpired(hold.expires_at, now)) {
    throw makeError("Phiên giữ ghế đã hết hạn", 410);
  }

  const seats = await loadRequestedSeats({ showtimeId, seatIds: normalizedSeatIds, session });
  if (seats.length !== normalizedSeatIds.length) {
    throw makeError("Một hoặc nhiều ghế không tồn tại trong suất chiếu", 400);
  }
  if (seats.some((seat) => isBrokenSeatType(seat.seat_id?.seat_type_id))) {
    throw makeError("Ghế hỏng không thể giữ vé", 409);
  }
  validateCoupleSeatSelection(seats);

  const previousIds = new Set((hold.showtime_seat_ids || []).map(String));
  const desiredIds = new Set(normalizedSeatIds);
  const requestedSeatMap = new Map(seats.map((seat) => [String(seat._id), seat]));
  const hasLostSeat = [...previousIds]
    .filter((seatId) => desiredIds.has(seatId))
    .map((seatId) => requestedSeatMap.get(seatId))
    .some((seat) =>
      !seat || seat.status !== "held" || String(seat.hold_id || "") !== String(hold._id),
    );
  if (hasLostSeat) {
    throw makeError("Một hoặc nhiều ghế không còn thuộc phiên giữ ghế", 409);
  }

  const addedIds = normalizedSeatIds.filter((seatId) => !previousIds.has(seatId));
  const removedIds = [...previousIds].filter((seatId) => !desiredIds.has(seatId));
  const acquired = [];

  for (const seatId of addedIds) {
    const previousSeat = await ShowtimeSeat.findOneAndUpdate(
      {
        _id: seatId,
        showtime_id: showtimeId,
        deleted_at: null,
        $or: [
          { status: "available" },
          { status: "held", hold_id: hold._id },
        ],
      },
      {
        $set: {
          status: "held",
          held_by: userId,
          hold_id: hold._id,
          reserved_by_booking_id: null,
          hold_expires_at: hold.expires_at,
        },
      },
      { new: false, session },
    );

    if (!previousSeat) {
      await Promise.all(acquired.map((entry) => ShowtimeSeat.updateOne(
        { _id: entry._id, status: "held", hold_id: hold._id },
        {
          $set: {
            status: entry.status,
            held_by: entry.held_by || null,
            hold_id: entry.hold_id || null,
            hold_expires_at: entry.hold_expires_at || null,
          },
        },
        { session },
      )));
      throw makeError("Một hoặc nhiều ghế vừa được người khác giữ. Vui lòng tải lại sơ đồ ghế.", 409);
    }
    acquired.push(previousSeat);
  }

  if (removedIds.length) {
    await ShowtimeSeat.updateMany(
      { _id: { $in: removedIds }, status: "held", hold_id: hold._id },
      {
        $set: {
          status: "available",
          held_by: null,
          hold_id: null,
          reserved_by_booking_id: null,
          hold_expires_at: null,
        },
      },
      { session },
    );
  }

  await SeatHold.updateOne(
    { _id: hold._id, status: "active", expires_at: hold.expires_at },
    { $set: { showtime_seat_ids: normalizedSeatIds } },
    { session },
  );

  return {
    hold_id: hold._id,
    hold_token: hold.token,
    showtime_id: hold.showtime_id,
    showtime_seat_ids: normalizedSeatIds,
    expires_at: hold.expires_at,
  };
};

export const releaseSeatHold = async ({
  userId,
  showtimeId,
  token = "",
  seatIds = [],
  now = new Date(),
  session = null,
}) => {
  const hold = await getActiveSeatHold({ userId, showtimeId, token, now, session });
  if (!hold) return { released: false, showtime_seat_ids: [] };

  const currentIds = (hold.showtime_seat_ids || []).map(String);
  const requestedIds = Array.isArray(seatIds) ? seatIds.map(String) : [];
  const releaseIds = requestedIds.length
    ? currentIds.filter((seatId) => requestedIds.includes(seatId))
    : currentIds;
  const remainingIds = currentIds.filter((seatId) => !releaseIds.includes(seatId));

  await ShowtimeSeat.updateMany(
    { _id: { $in: releaseIds }, status: "held", hold_id: hold._id },
    {
      $set: {
        status: "available",
        held_by: null,
        hold_id: null,
        reserved_by_booking_id: null,
        hold_expires_at: null,
      },
    },
    { session },
  );

  await SeatHold.updateOne(
    { _id: hold._id, status: "active" },
    remainingIds.length
      ? { $set: { showtime_seat_ids: remainingIds } }
      : { $set: { showtime_seat_ids: [], status: "released", released_at: now } },
    { session },
  );

  return { released: releaseIds.length > 0, showtime_seat_ids: remainingIds };
};
