import test from "node:test";
import assert from "node:assert/strict";
import { bookingNeedsRewardCreditReview } from "../src/services/loyaltyReconciliationService.js";

const activatedAt = new Date("2026-09-12T00:00:00.000Z");

test("paid bookings before membership activation do not block loyalty reconciliation", () => {
  assert.equal(bookingNeedsRewardCreditReview({
    payment_status: "paid",
    created_at: new Date("2026-07-31T00:00:00.000Z"),
    reward_points_credited_at: null,
  }, activatedAt), false);
});

test("paid bookings after membership activation require a reward credit marker", () => {
  assert.equal(bookingNeedsRewardCreditReview({
    payment_status: "paid",
    created_at: new Date("2026-09-13T00:00:00.000Z"),
    reward_points_credited_at: null,
  }, activatedAt), true);
});

test("credited or unpaid bookings do not block loyalty reconciliation", () => {
  assert.equal(bookingNeedsRewardCreditReview({
    payment_status: "paid",
    created_at: new Date("2026-09-13T00:00:00.000Z"),
    reward_points_credited_at: new Date("2026-09-13T00:05:00.000Z"),
  }, activatedAt), false);
  assert.equal(bookingNeedsRewardCreditReview({
    payment_status: "pending",
    created_at: new Date("2026-09-13T00:00:00.000Z"),
    reward_points_credited_at: null,
  }, activatedAt), false);
});
