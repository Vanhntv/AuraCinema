import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingPrintPayload,
  getInitialPrintEligibility,
  isBookingShowtimeEnded,
  validateReprintRequest,
} from "../src/controllers/adminBookingPrintControllers.js";

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
  ]);

  assert.deepEqual(result.eligible.map((ticket) => ticket.seatLabel), ["A1"]);
  assert.deepEqual(result.skipped.map((ticket) => ticket.reason), [
    "ALREADY_PRINTED",
    "CHECKED_IN",
    "CANCELLED",
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
      movie_snapshot: { title: "Phim" },
      seat_items: [{ seat_label: "A1" }],
      combos: [{ name: "Combo", quantity: 1, subtotal: 100000 }],
      pricing: { total: 150000 },
    },
    tickets: [makeTicket({ seatLabel: "A1" })],
    qrPayloadByTicketId: new Map([["ticket-A1", "AURA_TICKET:token-a1"]]),
  });

  assert.equal(payload.booking.bookingCode, "AURA000000000001");
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
