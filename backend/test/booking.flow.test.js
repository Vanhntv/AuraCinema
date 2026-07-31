import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { confirmBookingPayment, createBooking } from "../src/controllers/bookingsControllers.js";
import { holdShowtimeSeats } from "../src/controllers/showtimeSeatsControllers.js";
import Booking from "../src/models/Booking.js";
import Showtime from "../src/models/Showtime.js";
import ShowtimeSeat from "../src/models/ShowtimeSeat.js";
import User from "../src/models/User.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const sessionResult = (value) => ({
  session: async () => value,
});

const populateSessionResult = (value) => ({
  populate() {
    return {
      session: async () => value,
    };
  },
});

const withPatched = async (patches, callback) => {
  const originals = patches.map(([target, key, value]) => {
    const original = target[key];
    target[key] = value;
    return [target, key, original];
  });

  try {
    return await callback();
  } finally {
    for (const [target, key, original] of originals.reverse()) {
      target[key] = original;
    }
  }
};

const makeFakeSession = () => ({
  async withTransaction(callback) {
    await callback();
  },
  async endSession() {},
});

const makeSeat = ({ id, typeName, row = "A", number = 1, price = 50000, heldBy }) => ({
  _id: id,
  price,
  seat_id: {
    seat_row: row,
    seat_number: number,
    seat_type_id: { name: typeName },
  },
  held_by: heldBy,
});

test("hold seats rejects unauthenticated requests before any seat is held", async () => {
  const req = { headers: {} };
  const res = makeResponse();
  let nextCalled = false;

  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /token/i);
});

test("hold seats releases expired holds before validating a new hold", async () => {
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const updateCalls = [];

  await withPatched([
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      updateCalls.push({ filter, update });
      return { modifiedCount: 1 };
    }],
    [ShowtimeSeat, "find", async () => [
      { _id: seatId, status: "available", held_by: null },
    ]],
  ], async () => {
    const req = {
      user: { id: userId },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId] },
    };
    const res = makeResponse();

    await holdShowtimeSeats(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(updateCalls.length, 2);
    assert.deepEqual(updateCalls[0].filter.status, "held");
    assert.ok(updateCalls[0].filter.hold_expires_at.$lte instanceof Date);
    assert.deepEqual(updateCalls[0].update.$set, {
      status: "available",
      held_by: null,
      hold_expires_at: null,
    });
    assert.deepEqual(updateCalls[1].filter, { _id: { $in: [seatId] } });
    assert.equal(String(updateCalls[1].update.$set.held_by), userId);
  });
});

test("create booking allows multiple seat types in one booking", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatIds = [
    new mongoose.Types.ObjectId().toString(),
    new mongoose.Types.ObjectId().toString(),
  ];
  const bookingId = new mongoose.Types.ObjectId().toString();
  let createdPayload = null;
  let reservedUpdate = null;

  await withPatched([
    [mongoose, "startSession", async () => makeFakeSession()],
    [User, "findOne", () => sessionResult({
      _id: userId,
      full_name: "Test User",
      email: "test@example.com",
      phone: "0900000000",
    })],
    [Showtime, "findOne", () => sessionResult({
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
    })],
    [ShowtimeSeat, "find", () => populateSessionResult([
      makeSeat({ id: seatIds[0], typeName: "Ghế thường", number: 1, heldBy: userId }),
      makeSeat({ id: seatIds[1], typeName: "VIP", number: 2, price: 70000, heldBy: userId }),
    ])],
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      reservedUpdate = { filter, update };
      return { modifiedCount: 2 };
    }],
    [Booking, "create", async ([payload]) => {
      createdPayload = payload;
      return [{ _id: bookingId, ...payload }];
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: seatIds },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data._id, bookingId);
    assert.deepEqual(reservedUpdate.filter._id.$in.map(String), seatIds);
    assert.equal(reservedUpdate.update.$set.status, "reserved");
    assert.equal(createdPayload.subtotal_price, 120000);
    assert.equal(createdPayload.total_price, 120000);
    assert.equal(createdPayload.status, "pending");
    assert.equal(createdPayload.payment_status, "pending");
  });
});

test("create booking reserves held seats and stores the computed total", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatIds = [
    new mongoose.Types.ObjectId().toString(),
    new mongoose.Types.ObjectId().toString(),
  ];
  const bookingId = new mongoose.Types.ObjectId().toString();
  let updatedReservedSeats = [];
  let seatUpdate = null;
  let createdPayload = null;

  await withPatched([
    [mongoose, "startSession", async () => makeFakeSession()],
    [User, "findOne", () => sessionResult({
      _id: userId,
      full_name: "Test User",
      email: "test@example.com",
      phone: "0900000000",
    })],
    [Showtime, "findOne", () => sessionResult({
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
    })],
    [ShowtimeSeat, "find", () => populateSessionResult([
      makeSeat({ id: seatIds[0], typeName: "Ghế thường", number: 1, price: 50000, heldBy: userId }),
      makeSeat({ id: seatIds[1], typeName: "Ghế thường", number: 2, price: 50000, heldBy: userId }),
    ])],
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      updatedReservedSeats = filter._id.$in.map(String);
      seatUpdate = update;
      return { modifiedCount: 2 };
    }],
    [Booking, "create", async ([payload]) => {
      createdPayload = payload;
      return [{ _id: bookingId, ...payload }];
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: seatIds },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data._id, bookingId);
    assert.deepEqual(updatedReservedSeats, seatIds);
    assert.equal(seatUpdate.$set.status, "reserved");
    assert.match(createdPayload.booking_code, /^AURA-[A-Z0-9]+-[A-Z0-9]+$/);
    assert.equal(createdPayload.subtotal_price, 100000);
    assert.equal(createdPayload.discount_amount, 0);
    assert.equal(createdPayload.total_price, 100000);
    assert.equal(createdPayload.status, "pending");
    assert.equal(createdPayload.payment_status, "pending");
    assert.deepEqual(createdPayload.showtime_seat_ids.map(String), seatIds);
  });
});

test("confirm booking payment marks reserved seats as booked", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatIds = [
    new mongoose.Types.ObjectId().toString(),
    new mongoose.Types.ObjectId().toString(),
  ];
  const bookingId = new mongoose.Types.ObjectId().toString();
  let bookedSeatUpdate = null;
  const booking = {
    _id: bookingId,
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: seatIds,
    combos: [],
    voucher: undefined,
    subtotal_price: 100000,
    discount_amount: 0,
    total_price: 100000,
    status: "pending",
    payment_status: "pending",
    async save() {
      return this;
    },
  };

  await withPatched([
    [mongoose, "startSession", async () => makeFakeSession()],
    [Booking, "findOne", () => sessionResult(booking)],
    [Showtime, "findOne", () => sessionResult({
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
    })],
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      bookedSeatUpdate = { filter, update };
      return { modifiedCount: 2 };
    }],
  ], async () => {
    const req = {
      params: { id: bookingId },
      user: { id: userId, role: "user" },
      body: { payment_provider: "internal", transaction_id: "txn_test" },
    };
    const res = makeResponse();

    await confirmBookingPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(bookedSeatUpdate.filter._id.$in.map(String), seatIds);
    assert.equal(bookedSeatUpdate.filter.status, "reserved");
    assert.equal(bookedSeatUpdate.update.$set.status, "booked");
    assert.equal(booking.status, "confirmed");
    assert.equal(booking.payment_status, "paid");
    assert.equal(booking.payment_provider, "internal");
    assert.equal(booking.payment_transaction_id, "txn_test");
    assert.ok(booking.paid_at instanceof Date);
  });
});

test("create booking retries when generated booking_code collides", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const createPayloads = [];

  await withPatched([
    [mongoose, "startSession", async () => makeFakeSession()],
    [User, "findOne", () => sessionResult({
      _id: userId,
      full_name: "Test User",
      email: "test@example.com",
      phone: "0900000000",
    })],
    [Showtime, "findOne", () => sessionResult({
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
    })],
    [ShowtimeSeat, "find", () => populateSessionResult([
      makeSeat({ id: seatId, typeName: "Ghế thường", number: 1, price: 50000, heldBy: userId }),
    ])],
    [ShowtimeSeat, "updateMany", async () => ({ modifiedCount: 1 })],
    [Booking, "create", async ([payload]) => {
      createPayloads.push(payload);
      if (createPayloads.length === 1) {
        const duplicateError = new Error("E11000 duplicate key error collection: test.bookings index: booking_code_1 dup key");
        duplicateError.code = 11000;
        duplicateError.keyPattern = { booking_code: 1 };
        duplicateError.keyValue = { booking_code: payload.booking_code };
        throw duplicateError;
      }
      return [{ _id: bookingId, ...payload }];
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId] },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createPayloads.length, 2);
    assert.match(createPayloads[0].booking_code, /^AURA-[A-Z0-9]+-[A-Z0-9]+$/);
    assert.match(createPayloads[1].booking_code, /^AURA-[A-Z0-9]+-[A-Z0-9]+$/);
  });
});

test("create booking falls back when MongoDB transactions are unsupported", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const failingSession = {
    async withTransaction() {
      throw new Error("Only servers in a sharded cluster can start a new transaction at the active transaction number");
    },
    async endSession() {},
  };
  const sessionsUsed = [];

  await withPatched([
    [mongoose, "startSession", async () => failingSession],
    [User, "findOne", () => ({
      session: async (session) => {
        sessionsUsed.push(session);
        return {
          _id: userId,
          full_name: "Test User",
          email: "test@example.com",
          phone: "0900000000",
        };
      },
    })],
    [Showtime, "findOne", () => ({
      session: async (session) => {
        sessionsUsed.push(session);
        return {
          _id: showtimeId,
          movie_id: new mongoose.Types.ObjectId(),
        };
      },
    })],
    [ShowtimeSeat, "find", () => ({
      populate() {
        return {
          session: async (session) => {
            sessionsUsed.push(session);
            return [
              makeSeat({ id: seatId, typeName: "Ghế thường", number: 1, price: 50000, heldBy: userId }),
            ];
          },
        };
      },
    })],
    [ShowtimeSeat, "updateMany", async () => ({ modifiedCount: 1 })],
    [Booking, "create", async ([payload], options) => {
      sessionsUsed.push(options.session);
      return [{ _id: bookingId, ...payload }];
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId] },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data._id, bookingId);
    assert.ok(sessionsUsed.length > 0);
    assert.ok(sessionsUsed.every((session) => session === null));
  });
});
