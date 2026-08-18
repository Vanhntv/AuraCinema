import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingQrPayload,
  getBookingOrderQrPayload,
  issueBookingOrderQr,
  parseBookingQrPayload,
} from "../src/services/bookingOrderService.js";

test("booking QR payload uses a dedicated versioned prefix", () => {
  const payload = buildBookingQrPayload("secure-token");

  assert.equal(payload, "AURA_BOOKING_V2:secure-token");
  assert.equal(parseBookingQrPayload(payload), "secure-token");
  assert.equal(parseBookingQrPayload("AURA_TICKET:secure-token"), "");
  assert.equal(parseBookingQrPayload("AURA_BOOKING_V2:"), "");
});

test("issuing an order QR stores only hash and encrypted token", () => {
  const issued = issueBookingOrderQr(new Date("2026-08-18T08:00:00.000Z"));

  assert.equal(issued.token_hash.length, 64);
  assert.match(issued.token_encrypted, /^v1:/);
  assert.equal(issued.issued_at.toISOString(), "2026-08-18T08:00:00.000Z");
  assert.match(getBookingOrderQrPayload({ ticketing_version: 2, order_qr: issued }), /^AURA_BOOKING_V2:/);
});

test("legacy bookings cannot expose an order QR", () => {
  assert.throws(
    () => getBookingOrderQrPayload({ ticketing_version: 1 }),
    (error) => error.statusCode === 409 && error.code === "LEGACY_BOOKING_UNSUPPORTED",
  );
});
