import assert from "node:assert/strict";
import test from "node:test";
import Booking from "../src/models/Booking.js";
import User from "../src/models/User.js";
import { createCounterSale, getShiftReport, lookupStaffBookingOrder } from "../src/controllers/staffPosControllers.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return body; },
});

test("counter sale requires the staff seat hold token", async () => {
  const showtimeId = "507f1f77bcf86cd799439011";
  const seatId = "507f191e810c19729de860ea";
  const res = makeResponse();

  await createCounterSale({
    body: { showtime_id: showtimeId, showtime_seat_ids: [seatId] },
    user: { id: "507f1f77bcf86cd799439012" },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test("staff booking QR lookup returns every booked seat", async () => {
  const originalBookingFindOne = Booking.findOne;
  let bookingFilter;
  Booking.findOne = (filter) => {
    bookingFilter = filter;
    return {
      select: () => ({
        lean: async () => ({
          booking_code: "AURA000000000001",
          status: "confirmed",
          payment_status: "paid",
          movie_snapshot: { title: "Dune" },
          showtime_snapshot: { start_time: new Date("2030-01-01T10:00:00.000Z"), room_name: "Phòng 1" },
          seat_items: [
            { seat_label: "A1", seat_type: "VIP" },
            { seat_label: "A2", seat_type: "VIP" },
            { seat_label: "A3", seat_type: "Thường" },
          ],
          combos: [{ name: "Combo Couple", quantity: 1 }],
        }),
      }),
    };
  };

  const res = makeResponse();
  try {
    await lookupStaffBookingOrder({ body: { qrToken: "AURA_BOOKING_V2:secure-token" } }, res);
  } finally {
    Booking.findOne = originalBookingFindOne;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.qrType, "BOOKING");
  assert.equal(res.body.data.seat.label, "A1, A2, A3");
  assert.equal(res.body.data.seat.type, "VIP, Thường");
  assert.deepEqual(res.body.data.booking.combos, [{ name: "Combo Couple", quantity: 1 }]);
  assert.equal(bookingFilter.ticketing_version, 2);
  assert.equal(typeof bookingFilter["order_qr.token_hash"], "string");
});

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
