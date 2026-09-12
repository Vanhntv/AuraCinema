import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Booking from "../src/models/Booking.js";
import { updateAdminBookingPayment, cancelAdminBooking } from "../src/controllers/adminBookingsControllers.js";

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("admin cannot request a removed payment status", async () => {
  const res = response();
  await updateAdminBookingPayment({ params: { id: String(new mongoose.Types.ObjectId()) }, body: { payment_status: "refunded" } }, res);
  assert.equal(res.statusCode, 400);
});

test("old cancellation option is rejected rather than silently cancelling", async () => {
  const res = response();
  await cancelAdminBooking({ params: { id: String(new mongoose.Types.ObjectId()) }, body: { refund_payment: true } }, res);
  assert.equal(res.statusCode, 400);
});

test("admin cannot overwrite a paid or review transaction through payment status editing", async t => {
  t.mock.method(mongoose, "startSession", async () => ({
    withTransaction: callback => callback(), endSession: async () => {},
  }));
  for (const payment_status of ["paid", "review_required", "refund_pending", "refunded"]) {
    const booking = { _id: new mongoose.Types.ObjectId(), status: "confirmed", payment_status };
    const stub = t.mock.method(Booking, "findById", () => ({ session: async () => booking }));
    const res = response();
    await updateAdminBookingPayment({ params: { id: String(booking._id) }, body: { payment_status: "cancelled" } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(booking.payment_status, payment_status);
    stub.mock.restore();
  }
});
