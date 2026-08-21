import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { verifySepayPgReturn } from "../src/controllers/paymentsControllers.js";
import Booking from "../src/models/Booking.js";
import Payment from "../src/models/Payment.js";
import ShowtimeSeat from "../src/models/ShowtimeSeat.js";
import { buildSepayPgCheckoutFields } from "../src/services/sepayPgPaymentService.js";

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

const withEnv = async (values, callback) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  try {
    Object.assign(process.env, values);
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

const makeSession = () => ({
  async withTransaction(callback) {
    await callback();
  },
  async endSession() {},
});

test("SePay checkout sends cancel and error returns through backend verification", async () => {
  await withEnv({
    SEPAY_PG_ENV: "sandbox",
    SEPAY_PG_MERCHANT_ID: "merchant-test",
    SEPAY_PG_SECRET_KEY: "secret-test",
  }, async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      booking_code: "AURA123456789",
      user_id: new mongoose.Types.ObjectId(),
    };

    const { fields } = buildSepayPgCheckoutFields({
      booking,
      amount: 70000,
      frontendUrl: "http://localhost:5173",
      customerName: "Khách thử nghiệm",
    });

    assert.match(fields.cancel_url, /\/payment\/sepay-pg-return\?/);
    assert.match(fields.cancel_url, /booking_id=/);
    assert.match(fields.cancel_url, /invoice=AURA123456789/);
    assert.match(fields.cancel_url, /sepay_result=cancel/);
    assert.match(fields.error_url, /sepay_result=error/);
  });
});

test("SePay cancelled return cancels pending booking and releases reserved seats", async () => {
  const bookingId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const seatId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    booking_code: "AURA123456789",
    user_id: userId,
    showtime_seat_ids: [seatId],
    combos: [],
    voucher: {},
    status: "pending",
    payment_status: "pending",
    total_price: 70000,
    async save() {
      return this;
    },
  };
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    status: "pending",
    async save() {
      return this;
    },
  };
  let releasedSeatFilter = null;
  let releasedSeatUpdate = null;

  await withPatched([
    [mongoose, "startSession", async () => makeSession()],
    [Booking, "findById", () => ({ session: async () => booking })],
    [Payment, "findOneAndUpdate", async () => payment],
    [ShowtimeSeat, "updateMany", async (filter, update) => {
      releasedSeatFilter = filter;
      releasedSeatUpdate = update;
      return { modifiedCount: 1 };
    }],
  ], async () => {
    const req = {
      query: {
        booking_id: String(bookingId),
        invoice: "AURA123456789",
        sepay_result: "cancel",
      },
    };
    const res = makeResponse();

    await verifySepayPgReturn(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Thanh toán SePay đã bị hủy");
    assert.equal(booking.status, "cancelled");
    assert.equal(booking.payment_status, "cancelled");
    assert.equal(booking.cancellation_reason, "Khách hủy thanh toán SePay");
    assert.equal(payment.status, "failed");
    assert.equal(String(releasedSeatFilter.reserved_by_booking_id), String(bookingId));
    assert.equal(releasedSeatUpdate.$set.status, "available");
  });
});
