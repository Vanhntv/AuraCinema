import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPaymentCountdown,
  getPaymentCountdownTone,
  getRemainingSeconds,
  isBookingExpired,
} from "./bookingExpiry.js";

test("countdown uses the backend deadline and rounds partial seconds up", () => {
  const now = new Date("2026-08-18T00:00:00.500Z");
  const expiresAt = new Date("2026-08-18T00:00:02.000Z");

  assert.equal(getRemainingSeconds(expiresAt, now), 2);
  assert.equal(getRemainingSeconds(expiresAt, expiresAt), 0);
  assert.equal(getRemainingSeconds(null, now), 0);
});

test("booking expiry recognizes server statuses and a reached deadline", () => {
  const now = new Date("2026-08-18T00:10:00.000Z");

  assert.equal(isBookingExpired("expired", null, now), true);
  assert.equal(isBookingExpired("refund_pending", null, now), true);
  assert.equal(isBookingExpired("pending", "2026-08-18T00:10:00.000Z", now), true);
  assert.equal(isBookingExpired("pending", "2026-08-18T00:10:00.001Z", now), false);
  assert.equal(isBookingExpired("paid", "2026-08-18T00:00:00.000Z", now), false);
});

test("payment countdown formats minutes and seconds with stable two-digit groups", () => {
  assert.equal(formatPaymentCountdown(585), "09:45");
  assert.equal(formatPaymentCountdown(61), "01:01");
  assert.equal(formatPaymentCountdown(0), "00:00");
});

test("payment countdown becomes urgent during the final two minutes", () => {
  assert.equal(getPaymentCountdownTone(121), "default");
  assert.equal(getPaymentCountdownTone(120), "urgent");
  assert.equal(getPaymentCountdownTone(1), "urgent");
  assert.equal(getPaymentCountdownTone(0), "expired");
});
