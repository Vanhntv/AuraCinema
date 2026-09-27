import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  buildBookingPrintPayload,
  confirmBookingOrderPrint,
  getInitialPrintEligibility,
  isBookingShowtimeEnded,
  validateReprintRequest,
} from "../src/controllers/adminBookingPrintControllers.js";
import Booking from "../src/models/Booking.js";
import BookingActionLog from "../src/models/BookingActionLog.js";
import Ticket from "../src/models/Ticket.js";

const makeTicket = (overrides = {}) => ({
  _id: overrides._id || `ticket-${overrides.seatLabel || "A1"}`,
  bookingId: "booking-1",
  ticketCode: `AURA-${overrides.seatLabel || "A1"}`,
  seatLabel: overrides.seatLabel || "A1",
  seatType: "Ghế thường",
  price: 50000,
  status: "VALID",
  printedAt: null,
  qrTokenEncrypted: "encrypted",
  ...overrides,
});

test("initial order print selects only valid tickets never printed before", () => {
  const result = getInitialPrintEligibility([
    makeTicket({ seatLabel: "A1" }),
    makeTicket({ seatLabel: "A2", printedAt: new Date() }),
    makeTicket({ seatLabel: "A3", status: "CHECKED_IN" }),
    makeTicket({ seatLabel: "A4", status: "CANCELLED" }),
    makeTicket({ seatLabel: "A5", printPendingAt: new Date() }),
  ]);

  assert.deepEqual(result.eligible.map((ticket) => ticket.seatLabel), ["A1"]);
  assert.deepEqual(result.skipped.map((ticket) => ticket.reason), [
    "ALREADY_PRINTED",
    "CHECKED_IN",
    "CANCELLED",
    "PRINT_PENDING",
  ]);
});

test("reprint requires a reason and tickets belonging to the booking", () => {
  assert.throws(
    () => validateReprintRequest({ bookingId: "booking-1", ticketIds: ["ticket-1"], reason: "" }),
    (error) => error.statusCode === 400,
  );
  assert.deepEqual(
    validateReprintRequest({ bookingId: "booking-1", ticketIds: ["ticket-1"], reason: "Máy in kẹt giấy" }),
    { bookingId: "booking-1", ticketIds: ["ticket-1"], reason: "Máy in kẹt giấy" },
  );
});

test("booking print payload contains summary and ticket QR payloads", () => {
  const payload = buildBookingPrintPayload({
    booking: {
      _id: "booking-1",
      booking_code: "AURA000000000001",
      created_at: new Date("2026-08-18T08:00:00.000Z"),
      movie_snapshot: { title: "Phim" },
      seat_items: [{ seat_label: "A1" }],
      combos: [{ name: "Combo", quantity: 1, subtotal: 100000 }],
      pricing: { total: 150000 },
    },
    tickets: [makeTicket({ seatLabel: "A1" })],
    qrPayloadByTicketId: new Map([["ticket-A1", "AURA_TICKET:token-a1"]]),
    printedBy: { id: "staff-1", accountName: "staff.nguyenvana" },
  });

  assert.equal(payload.booking.bookingCode, "AURA000000000001");
  assert.equal(payload.booking.createdAt.toISOString(), "2026-08-18T08:00:00.000Z");
  assert.equal(payload.printedBy.accountName, "staff.nguyenvana");
  assert.equal(payload.tickets.length, 1);
  assert.equal(payload.tickets[0].qrPayload, "AURA_TICKET:token-a1");
});

test("an order cannot be printed after its showtime has ended", () => {
  assert.equal(isBookingShowtimeEnded(
    { showtime_snapshot: { end_time: "2026-08-18T10:00:00.000Z" } },
    new Date("2026-08-18T10:00:00.000Z"),
  ), true);
  assert.equal(isBookingShowtimeEnded(
    { showtime_snapshot: { end_time: "2026-08-18T10:00:00.000Z" } },
    new Date("2026-08-18T09:59:59.000Z"),
  ), false);
});

test("order print confirmation records success and locks the pending tickets", async () => {
  const originals = [
    [Booking, "findOne", Booking.findOne],
    [Ticket, "find", Ticket.find],
    [Ticket, "updateMany", Ticket.updateMany],
    [BookingActionLog, "create", BookingActionLog.create],
  ];
  const bookingId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  let filter;
  let update;
  let log;
  Booking.findOne = async () => ({ _id: bookingId });
  Ticket.find = (query) => {
    filter = query;
    return { select: async () => [{ _id: new mongoose.Types.ObjectId() }, { _id: new mongoose.Types.ObjectId() }] };
  };
  Ticket.updateMany = async (_filter, value) => { update = value; return { modifiedCount: 2 }; };
  BookingActionLog.create = async (value) => { log = value; return value; };
  try {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await confirmBookingOrderPrint({ body: { bookingCode: "AURA123", printClaimId: "claim-1", success: true }, user: { id: adminId }, headers: {} }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(filter.printClaimId, "claim-1");
    assert.equal(filter.printedAt, null);
    assert.ok(update.$set.printedAt instanceof Date);
    assert.equal(update.$set.printPendingAt, null);
    assert.equal(log.result, "SUCCESS");
  } finally {
    originals.forEach(([object, key, value]) => { object[key] = value; });
  }
});
