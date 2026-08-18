import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import SeatHold from "../src/models/SeatHold.js";
import ShowtimeSeat from "../src/models/ShowtimeSeat.js";
import Booking from "../src/models/Booking.js";
import Combo from "../src/models/Combo.js";
import Payment from "../src/models/Payment.js";
import {
  expirePendingBooking,
  markLatePaymentForReview,
} from "../src/services/bookingExpiryService.js";
import { startBookingLifecycleWorker } from "../src/services/bookingLifecycleWorker.js";
import {
  acquireSeatHold,
  expireSeatHolds,
} from "../src/services/seatHoldService.js";
import {
  createPaymentExpiry,
  createSeatHoldExpiry,
  isExpired,
  validateCoupleSeatSelection,
} from "../src/services/seatHoldPolicy.js";

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

test("seat holds keep the first selection deadline for exactly five minutes", () => {
  const now = new Date("2026-08-18T00:00:00.000Z");

  assert.equal(
    createSeatHoldExpiry(now).toISOString(),
    "2026-08-18T00:05:00.000Z",
  );
});

test("pending bookings have exactly ten minutes to complete payment", () => {
  const now = new Date("2026-08-18T00:00:00.000Z");

  assert.equal(
    createPaymentExpiry(now).toISOString(),
    "2026-08-18T00:10:00.000Z",
  );
});

test("expiry is inclusive at the server deadline", () => {
  const deadline = new Date("2026-08-18T00:05:00.000Z");

  assert.equal(isExpired(deadline, new Date("2026-08-18T00:04:59.999Z")), false);
  assert.equal(isExpired(deadline, new Date("2026-08-18T00:05:00.000Z")), true);
  assert.equal(isExpired(null, new Date("2026-08-18T00:05:00.000Z")), false);
});

test("couple seats must be selected as an adjacent pair", () => {
  const coupleSeat = (id, number) => ({
    _id: id,
    seat_id: {
      seat_row: "H",
      seat_number: number,
      seat_type_id: { name: "Ghế đôi" },
    },
  });

  assert.throws(
    () => validateCoupleSeatSelection([coupleSeat("seat-1", 1)]),
    /đủ cặp/i,
  );
  assert.doesNotThrow(() => validateCoupleSeatSelection([
    coupleSeat("seat-1", 1),
    coupleSeat("seat-2", 2),
  ]));
});

test("a hold rejects more than eight seats before touching persistence", async () => {
  await assert.rejects(
    acquireSeatHold({
      userId: new mongoose.Types.ObjectId(),
      showtimeId: new mongoose.Types.ObjectId(),
      seatIds: Array.from({ length: 9 }, () => new mongoose.Types.ObjectId()),
    }),
    (error) => error.statusCode === 400 && /8 ghế/.test(error.message),
  );
});

test("changing seats keeps the original server expiry", async () => {
  const holdId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const showtimeId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  const originalExpiry = new Date("2026-08-18T00:05:00.000Z");
  let savedSeatIds = [];

  const hold = {
    _id: holdId,
    token: "existing-token",
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: [],
    status: "active",
    expires_at: originalExpiry,
  };

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [] })],
    [SeatHold, "findOne", async () => hold],
    [SeatHold, "updateOne", async (filter, update) => {
      savedSeatIds = update.$set.showtime_seat_ids;
      return { modifiedCount: 1 };
    }],
    [ShowtimeSeat, "find", () => ({
      populate: async () => [{
        _id: seatId,
        status: "available",
        seat_id: { seat_type_id: { name: "Ghế thường" } },
      }],
    })],
    [ShowtimeSeat, "findOneAndUpdate", async (filter, update) => {
      assert.equal(update.$set.hold_expires_at.toISOString(), originalExpiry.toISOString());
      return { _id: seatId, status: "available", hold_id: null };
    }],
    [ShowtimeSeat, "updateMany", async () => ({ modifiedCount: 0 })],
  ], async () => {
    const result = await acquireSeatHold({
      userId,
      showtimeId,
      seatIds: [seatId],
      token: "existing-token",
      now: new Date("2026-08-18T00:02:00.000Z"),
    });

    assert.equal(result.expires_at.toISOString(), originalExpiry.toISOString());
    assert.deepEqual(savedSeatIds.map(String), [String(seatId)]);
  });
});

test("an existing active hold cannot be replaced without its token", async () => {
  const userId = new mongoose.Types.ObjectId();
  const showtimeId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  const hold = {
    _id: new mongoose.Types.ObjectId(),
    token: "existing-token",
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: [seatId],
    status: "active",
    expires_at: new Date("2026-08-18T00:05:00.000Z"),
  };

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [] })],
    [SeatHold, "findOne", async () => hold],
  ], async () => {
    await assert.rejects(
      acquireSeatHold({
        userId,
        showtimeId,
        seatIds: [new mongoose.Types.ObjectId()],
        now: new Date("2026-08-18T00:02:00.000Z"),
      }),
      (error) => error.statusCode === 409 && /khôi phục phiên giữ ghế/i.test(error.message),
    );
  });
});

test("an active hold cannot keep a seat after ownership has been lost", async () => {
  const holdId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const showtimeId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  const hold = {
    _id: holdId,
    token: "existing-token",
    user_id: userId,
    showtime_id: showtimeId,
    showtime_seat_ids: [seatId],
    status: "active",
    expires_at: new Date("2026-08-18T00:05:00.000Z"),
  };

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [] })],
    [SeatHold, "findOne", async () => hold],
    [ShowtimeSeat, "find", () => ({
      populate: async () => [{
        _id: seatId,
        status: "available",
        hold_id: null,
        seat_id: { seat_type_id: { name: "Ghế thường" } },
      }],
    })],
  ], async () => {
    await assert.rejects(
      acquireSeatHold({
        userId,
        showtimeId,
        seatIds: [seatId],
        token: hold.token,
        now: new Date("2026-08-18T00:02:00.000Z"),
      }),
      (error) => error.statusCode === 409 && /không còn thuộc phiên giữ ghế/i.test(error.message),
    );
  });
});

test("an expired hold releases only seats owned by that hold", async () => {
  const holdId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  let releasedFilter = null;

  await withPatched([
    [SeatHold, "find", () => ({ limit: async () => [{
      _id: holdId,
      showtime_seat_ids: [seatId],
      status: "active",
    }] })],
    [SeatHold, "updateOne", async () => ({ modifiedCount: 1 })],
    [ShowtimeSeat, "updateMany", async (filter) => {
      releasedFilter = filter;
      return { modifiedCount: 1 };
    }],
  ], async () => {
    const expiredCount = await expireSeatHolds({
      now: new Date("2026-08-18T00:06:00.000Z"),
    });

    assert.equal(expiredCount, 1);
    assert.equal(String(releasedFilter.hold_id), String(holdId));
    assert.equal(releasedFilter.status, "held");
  });
});

test("an expired booking releases owned seats and combo stock only once", async () => {
  const bookingId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  const comboId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    user_id: new mongoose.Types.ObjectId(),
    showtime_seat_ids: [seatId],
    combos: [{ combo_id: comboId, quantity: 2 }],
    status: "pending",
    payment_status: "pending",
    payment_expires_at: new Date("2026-08-18T00:10:00.000Z"),
  };
  let claimCount = 0;
  let restoredComboCount = 0;
  let releasedSeatFilter = null;

  await withPatched([
    [Booking, "findOneAndUpdate", async () => {
      claimCount += 1;
      return claimCount === 1 ? booking : null;
    }],
    [Booking, "updateOne", async () => ({ modifiedCount: 1 })],
    [ShowtimeSeat, "updateMany", async (filter) => {
      releasedSeatFilter = filter;
      return { modifiedCount: 1 };
    }],
    [Combo, "updateOne", async (filter, update) => {
      assert.equal(String(filter._id), String(comboId));
      restoredComboCount += update.$inc.stock;
      return { modifiedCount: 1 };
    }],
    [Payment, "updateMany", async () => ({ modifiedCount: 1 })],
  ], async () => {
    const now = new Date("2026-08-18T00:10:00.000Z");
    const first = await expirePendingBooking({ booking, now });
    const second = await expirePendingBooking({ booking, now });

    assert.equal(first.expired, true);
    assert.equal(second.expired, false);
    assert.equal(restoredComboCount, 2);
    assert.equal(String(releasedSeatFilter.reserved_by_booking_id), String(bookingId));
  });
});

test("a successful provider callback after expiry is marked for refund review", async () => {
  const booking = {
    status: "cancelled",
    payment_status: "expired",
    payment_provider: "internal",
    payment_transaction_id: "",
    async save() { return this; },
  };
  const payment = {
    status: "expired",
    transaction_id: "",
    async save() { return this; },
  };

  await markLatePaymentForReview({
    booking,
    payment,
    provider: "vnpay",
    transactionId: "late-transaction",
    now: new Date("2026-08-18T00:11:00.000Z"),
  });

  assert.equal(booking.status, "cancelled");
  assert.equal(booking.payment_status, "refund_pending");
  assert.equal(booking.payment_provider, "vnpay");
  assert.equal(booking.payment_transaction_id, "late-transaction");
  assert.equal(payment.status, "review_required");
  assert.equal(payment.transaction_id, "late-transaction");
});

test("the lifecycle worker sweeps holds and bookings without overlapping runs", async () => {
  let scheduledRun = null;
  let releaseFirstRun;
  const calls = [];
  const blocker = new Promise((resolve) => { releaseFirstRun = resolve; });

  const stop = startBookingLifecycleWorker({
    intervalMs: 30000,
    runImmediately: false,
    expireSeatHoldsTask: async () => {
      calls.push("holds");
      await blocker;
    },
    expirePendingBookingsTask: async () => {
      calls.push("bookings");
    },
    setIntervalFn(callback, intervalMs) {
      assert.equal(intervalMs, 30000);
      scheduledRun = callback;
      return { unref() {} };
    },
    clearIntervalFn() {},
  });

  const firstRun = scheduledRun();
  const overlappingRun = scheduledRun();
  assert.deepEqual(calls, ["holds"]);
  releaseFirstRun();
  await Promise.all([firstRun, overlappingRun]);
  assert.deepEqual(calls, ["holds", "bookings"]);
  stop();
});
