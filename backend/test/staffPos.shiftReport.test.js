import assert from "node:assert/strict";
import test from "node:test";
import Booking from "../src/models/Booking.js";
import User from "../src/models/User.js";
import { getShiftReport } from "../src/controllers/staffPosControllers.js";

test("shift report totals only the current staff counter sales for the Vietnam calendar day", async () => {
  const originalBookingFind = Booking.find;
  const originalUserFindOne = User.findOne;
  let bookingFilter;

  User.findOne = () => ({ select: () => ({ lean: async () => ({ full_name: "Nguyễn Văn A" }) }) });
  Booking.find = (filter) => {
    bookingFilter = filter;
    return { select: () => ({ lean: async () => [
      { total_price: 120000, showtime_seat_ids: ["seat-1", "seat-2"] },
      { total_price: 74000, showtime_seat_ids: ["seat-3"] },
    ] }) };
  };

  let responseBody;
  const req = { user: { id: "staff-1" }, query: { date: "2026-05-13" } };
  const res = {
    status() { return this; },
    json(body) { responseBody = body; return body; },
  };

  try {
    await getShiftReport(req, res);
  } finally {
    Booking.find = originalBookingFind;
    User.findOne = originalUserFindOne;
  }

  assert.equal(responseBody.success, true);
  assert.deepEqual(responseBody.data, {
    staff_name: "Nguyễn Văn A",
    date: "2026-05-13",
    cash_total: 194000,
    pos_ticket_count: 3,
    online_scanned_count: null,
  });
  assert.equal(bookingFilter.sales_channel, "counter");
  assert.equal(bookingFilter.sold_by, "staff-1");
  assert.equal(bookingFilter.status, "confirmed");
  assert.equal(bookingFilter.payment_status, "paid");
  assert.equal(bookingFilter.paid_at.$gte.toISOString(), "2026-05-12T17:00:00.000Z");
  assert.equal(bookingFilter.paid_at.$lt.toISOString(), "2026-05-13T17:00:00.000Z");
});
