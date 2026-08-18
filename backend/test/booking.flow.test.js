import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { updateAdminBookingPayment } from "../src/controllers/adminBookingsControllers.js";
import { confirmBookingPayment, createBooking } from "../src/controllers/bookingsControllers.js";
import { holdShowtimeSeats } from "../src/controllers/showtimeSeatsControllers.js";
import Booking from "../src/models/Booking.js";
import SeatHold from "../src/models/SeatHold.js";
import Showtime from "../src/models/Showtime.js";
import ShowtimeSeat from "../src/models/ShowtimeSeat.js";
import Ticket from "../src/models/Ticket.js";
import User from "../src/models/User.js";
import RewardPointLog from "../src/models/RewardPointLog.js";

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
  populate() {
    return this;
  },
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
    _id: new mongoose.Types.ObjectId(),
    seat_row: row,
    seat_number: number,
    seat_code: `${row}${number}`,
    seat_type_id: { name: typeName },
  },
  held_by: heldBy,
});

const makeActiveHold = ({ userId, showtimeId, seatIds }) => ({
  _id: new mongoose.Types.ObjectId(),
  token: "hold-token",
  user_id: userId,
  showtime_id: showtimeId,
  showtime_seat_ids: seatIds,
  status: "active",
  expires_at: new Date(Date.now() + 5 * 60 * 1000),
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

test("hold seats returns the server-owned hold token and deadline", async () => {
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const holdId = new mongoose.Types.ObjectId();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  let atomicHoldUpdate = null;

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [] })],
    [SeatHold, "findOne", async () => null],
    [SeatHold, "create", async () => [{
      _id: holdId,
      token: "hold-token",
      user_id: userId,
      showtime_id: showtimeId,
      showtime_seat_ids: [],
      status: "active",
      expires_at: expiresAt,
    }]],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
    [ShowtimeSeat, "find", async () => [
      { _id: seatId, status: "available", held_by: null, seat_id: { seat_type_id: { name: "Ghế thường" } } },
    ]],
    [ShowtimeSeat, "findOneAndUpdate", async (filter, update) => {
      atomicHoldUpdate = update;
      return { _id: seatId, status: "available", held_by: null, hold_expires_at: null };
    }],
  ], async () => {
    const req = {
      user: { id: userId },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId] },
    };
    const res = makeResponse();

    await holdShowtimeSeats(req, res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.hold_token, "hold-token");
    assert.equal(new Date(res.body.data.expires_at).toISOString(), expiresAt.toISOString());
    assert.equal(String(atomicHoldUpdate.$set.hold_id), String(holdId));
    assert.equal(String(atomicHoldUpdate.$set.held_by), userId);
  });
});

test("hold seats rolls back partial acquisition when another user wins a seat", async () => {
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatIds = [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()];
  const userId = new mongoose.Types.ObjectId().toString();
  const holdId = new mongoose.Types.ObjectId();
  let atomicCall = 0;
  let rollbackFilter = null;
  let rollbackUpdate = null;

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [] })],
    [SeatHold, "findOne", async () => null],
    [SeatHold, "create", async () => [{
      _id: holdId,
      token: "hold-token",
      user_id: userId,
      showtime_id: showtimeId,
      showtime_seat_ids: [],
      status: "active",
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    }]],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
    [ShowtimeSeat, "find", async () => seatIds.map((id) => ({
      _id: id,
      status: "available",
      held_by: null,
      hold_expires_at: null,
      seat_id: { seat_type_id: { name: "Ghế thường" } },
    }))],
    [ShowtimeSeat, "findOneAndUpdate", async () => {
      atomicCall += 1;
      if (atomicCall === 2) return null;
      return { _id: seatIds[0], status: "available", held_by: null, hold_expires_at: null };
    }],
    [ShowtimeSeat, "updateOne", async (filter, update) => {
      rollbackFilter = filter;
      rollbackUpdate = update;
      return { modifiedCount: 1 };
    }],
  ], async () => {
    const req = {
      user: { id: userId },
      body: { showtime_id: showtimeId, showtime_seat_ids: seatIds },
    };
    const res = makeResponse();
    await holdShowtimeSeats(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(String(rollbackFilter._id), seatIds[0]);
    assert.equal(String(rollbackFilter.hold_id), String(holdId));
    assert.equal(rollbackUpdate.$set.status, "available");
  });
});

test("create booking requires a hold token before starting database work", async () => {
  let sessionStarted = false;

  await withPatched([
    [mongoose, "startSession", async () => {
      sessionStarted = true;
      throw new Error("database work must not start");
    }],
  ], async () => {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), role: "user" },
      body: {
        showtime_id: new mongoose.Types.ObjectId().toString(),
        showtime_seat_ids: [new mongoose.Types.ObjectId().toString()],
      },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /phiên giữ ghế/i);
    assert.equal(sessionStarted, false);
  });
});

test("create booking rejects broken seats", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const hold = makeActiveHold({ userId, showtimeId, seatIds: [seatId] });
  let updateCalled = false;

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
    [SeatHold, "findOne", () => sessionResult(hold)],
    [ShowtimeSeat, "find", () => populateSessionResult([
      makeSeat({ id: seatId, typeName: "Ghe hong", number: 1, heldBy: userId }),
    ])],
    [ShowtimeSeat, "updateMany", async () => {
      updateCalled = true;
      return { modifiedCount: 1 };
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId], hold_token: hold.token },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /ghe hong/i);
    assert.equal(updateCalled, false);
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
  const hold = makeActiveHold({ userId, showtimeId, seatIds });
  const movieId = new mongoose.Types.ObjectId();
  const roomId = new mongoose.Types.ObjectId();
  const cinemaId = new mongoose.Types.ObjectId();
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
      start_time: new Date("2026-08-18T10:00:00.000Z"),
      end_time: new Date("2026-08-18T12:00:00.000Z"),
      movie_id: {
        _id: movieId,
        title: "Phim thu nghiem",
        poster: "/poster.jpg",
        age_limit: 13,
      },
      room_id: {
        _id: roomId,
        name: "Phong 1",
        cinema_id: {
          _id: cinemaId,
          name: "AuraCinema",
          address: "Ha Noi",
        },
      },
    })],
    [SeatHold, "findOne", () => sessionResult(hold)],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
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
      body: { showtime_id: showtimeId, showtime_seat_ids: seatIds, hold_token: hold.token },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(String(res.body.data._id), String(createdPayload._id));
    assert.equal(res.body.data.order_qr, undefined);
    assert.deepEqual(reservedUpdate.filter._id.$in.map(String), seatIds);
    assert.equal(reservedUpdate.update.$set.status, "reserved");
    assert.equal(String(reservedUpdate.update.$set.reserved_by_booking_id), String(createdPayload._id));
    assert.equal(createdPayload.subtotal_price, 120000);
    assert.equal(createdPayload.total_price, 120000);
    assert.equal(createdPayload.status, "pending");
    assert.equal(createdPayload.payment_status, "pending");
    assert.equal(String(createdPayload.seat_hold_id), String(hold._id));
    assert.ok(createdPayload.payment_expires_at instanceof Date);
    assert.equal(createdPayload.ticketing_version, 2);
    assert.equal(createdPayload.order_qr.token_hash.length, 64);
    assert.match(createdPayload.order_qr.token_encrypted, /^v1:/);
    assert.equal(createdPayload.movie_snapshot.title, "Phim thu nghiem");
    assert.equal(createdPayload.showtime_snapshot.room_name, "Phong 1");
    assert.equal(createdPayload.seat_items.length, 2);
    assert.deepEqual(createdPayload.seat_items.map((item) => item.seat_type), ["Ghế thường", "VIP"]);
    assert.deepEqual(createdPayload.pricing, {
      ticket_subtotal: 120000,
      service_subtotal: 0,
      subtotal: 120000,
      discount: 0,
      total: 120000,
    });
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
  const hold = makeActiveHold({ userId, showtimeId, seatIds });
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
    [SeatHold, "findOne", () => sessionResult(hold)],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
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
      body: { showtime_id: showtimeId, showtime_seat_ids: seatIds, hold_token: hold.token },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(String(res.body.data._id), String(createdPayload._id));
    assert.deepEqual(updatedReservedSeats, seatIds);
    assert.equal(seatUpdate.$set.status, "reserved");
    assert.equal(String(seatUpdate.$set.reserved_by_booking_id), String(createdPayload._id));
    assert.match(createdPayload.booking_code, /^AURA\d{12}$/);
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
  const populatedBooking = {
    ...booking,
    showtime_id: {
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
      room_id: new mongoose.Types.ObjectId(),
    },
    showtime_seat_ids: seatIds.map((seatId, index) => ({
      _id: seatId,
      price: 50000,
      seat_id: {
        _id: new mongoose.Types.ObjectId(),
        seat_row: "A",
        seat_number: index + 1,
        seat_code: `A${index + 1}`,
      },
    })),
  };

  await withPatched([
    [mongoose, "startSession", async () => makeFakeSession()],
    [Booking, "findOne", () => sessionResult(booking)],
    [Booking, "findById", () => ({
      populate() {
        return this;
      },
      session() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve({
          ...populatedBooking,
          status: booking.status,
          payment_status: booking.payment_status,
        }).then(resolve, reject);
      },
    })],
    [Showtime, "findOne", () => sessionResult({
      _id: showtimeId,
      movie_id: new mongoose.Types.ObjectId(),
      room_id: new mongoose.Types.ObjectId(),
    })],
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      bookedSeatUpdate = { filter, update };
      return { modifiedCount: 2 };
    }],
    [User, "findOneAndUpdate", () => sessionResult({ reward_points: 10 })],
    [RewardPointLog, "create", async () => []],
    [Ticket, "find", () => ({
      select() {
        return this;
      },
      session: async () => [],
      sort() {
        return {
          select() {
            return {
              session: async () => populatedBooking.showtime_seat_ids.map((showtimeSeat) => ({
                _id: new mongoose.Types.ObjectId(),
                ticketCode: `AURA-TEST-${showtimeSeat.seat_id.seat_code}`,
                seatLabel: showtimeSeat.seat_id.seat_code,
                seatId: showtimeSeat.seat_id._id,
                qrTokenEncrypted: "v1:QTeouqvAKL8GjM7r:KRHBXPgwjaXEzaTVra3rKA:SllYk3iBBY1JUsasJaJDvA",
              })),
            };
          },
        };
      },
    })],
    [Ticket, "bulkWrite", async () => ({ upsertedCount: 2 })],
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
    assert.equal(String(bookedSeatUpdate.filter.reserved_by_booking_id), String(bookingId));
    assert.equal(bookedSeatUpdate.update.$set.status, "booked");
    assert.equal(booking.status, "confirmed");
    assert.equal(booking.payment_status, "paid");
    assert.equal(booking.payment_provider, "internal");
    assert.equal(booking.payment_transaction_id, "txn_test");
    assert.ok(booking.paid_at instanceof Date);
  });
});

test("admin payment cannot confirm a booking whose seats are owned by another booking", async () => {
  const userId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const showtimeId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  let saved = false;
  let creditedPoints = false;
  let issuedTickets = false;

  const booking = {
    _id: bookingId,
    booking_code: "AURA000000000001",
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: [seatId],
    combos: [],
    subtotal_price: 50000,
    total_price: 50000,
    status: "pending",
    payment_status: "pending",
    payment_provider: "internal",
    async save() {
      saved = true;
      return this;
    },
  };

  await withPatched([
    [Booking, "findById", () => booking],
    [ShowtimeSeat, "updateMany", async (filter) => {
      assert.equal(String(filter.reserved_by_booking_id), String(bookingId));
      return { modifiedCount: 0 };
    }],
    [ShowtimeSeat, "countDocuments", async (filter) => {
      assert.equal(String(filter.reserved_by_booking_id), String(bookingId));
      return 0;
    }],
    [User, "findOneAndUpdate", async () => {
      creditedPoints = true;
      return { reward_points: 5 };
    }],
    [RewardPointLog, "create", async () => []],
    [Ticket, "find", () => {
      issuedTickets = true;
      return {
        select() {
          return this;
        },
        session: async () => [],
      };
    }],
  ], async () => {
    const req = {
      params: { id: String(bookingId) },
      body: {
        payment_status: "paid",
        payment_provider: "manual",
        payment_transaction_id: "",
      },
    };
    const res = makeResponse();

    await updateAdminBookingPayment(req, res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /ghế/i);
    assert.equal(saved, false);
    assert.equal(creditedPoints, false);
    assert.equal(issuedTickets, false);
    assert.equal(booking.status, "pending");
    assert.equal(booking.payment_status, "pending");
  });
});

test("create booking retries when generated booking_code collides", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const createPayloads = [];
  const hold = makeActiveHold({ userId, showtimeId, seatIds: [seatId] });

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
    [SeatHold, "findOne", () => sessionResult(hold)],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
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
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId], hold_token: hold.token },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createPayloads.length, 2);
    assert.match(createPayloads[0].booking_code, /^AURA\d{12}$/);
    assert.match(createPayloads[1].booking_code, /^AURA\d{12}$/);
  });
});

test("create booking falls back when MongoDB transactions are unsupported", async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const showtimeId = new mongoose.Types.ObjectId().toString();
  const seatId = new mongoose.Types.ObjectId().toString();
  const hold = makeActiveHold({ userId, showtimeId, seatIds: [seatId] });
  let createdPayload = null;
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
      populate() {
        return this;
      },
      session: async (session) => {
        sessionsUsed.push(session);
        return {
          _id: showtimeId,
          movie_id: new mongoose.Types.ObjectId(),
        };
      },
    })],
    [SeatHold, "findOne", () => ({
      session: async (session) => {
        sessionsUsed.push(session);
        return hold;
      },
    })],
    [SeatHold, "updateOne", async (filter, update, options) => {
      sessionsUsed.push(options.session);
      return { modifiedCount: 1 };
    }],
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
      createdPayload = payload;
      return [{ ...payload }];
    }],
  ], async () => {
    const req = {
      user: { id: userId, role: "user" },
      body: { showtime_id: showtimeId, showtime_seat_ids: [seatId], hold_token: hold.token },
    };
    const res = makeResponse();

    await createBooking(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(String(res.body.data._id), String(createdPayload._id));
    assert.ok(sessionsUsed.length > 0);
    assert.ok(sessionsUsed.every((session) => session === null));
  });
});
