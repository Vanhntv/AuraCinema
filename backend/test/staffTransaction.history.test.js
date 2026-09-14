import assert from "node:assert/strict";
import test from "node:test";
import { addStaffTransactionNote, buildStaffTransactionFilter } from "../src/controllers/staffTransactionControllers.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return body; },
});

test("staff transaction history distinguishes member and guest customers", () => {
  assert.deepEqual(buildStaffTransactionFilter({ query: { customer_type: "member" } }), { user_id: { $ne: null } });
  assert.deepEqual(buildStaffTransactionFilter({ query: { customer_type: "guest" } }), { user_id: null });
});

test("staff transaction history searches orders, customers, payments and ticket bookings", () => {
  const filter = buildStaffTransactionFilter({ query: { q: "AURA-123" }, ticketBookingIds: ["booking-from-ticket"] });
  assert.equal(filter.$or.length, 6);
  assert.equal(filter.$or[0].booking_code.test("aura-123"), true);
  assert.deepEqual(filter.$or[5], { _id: { $in: ["booking-from-ticket"] } });
});

test("staff transaction date filters use complete Vietnam calendar days", () => {
  const filter = buildStaffTransactionFilter({ query: { date_from: "2026-09-13", date_to: "2026-09-13" } });
  assert.equal(filter.created_at.$gte.toISOString(), "2026-09-12T17:00:00.000Z");
  assert.equal(filter.created_at.$lt.toISOString(), "2026-09-13T17:00:00.000Z");
});

test("complaint notes require meaningful content before persistence", async () => {
  const res = makeResponse();
  await addStaffTransactionNote({ params: { id: "507f1f77bcf86cd799439011" }, body: { reason: "  " }, user: { id: "staff-1" } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /3 đến 1000/);
});
