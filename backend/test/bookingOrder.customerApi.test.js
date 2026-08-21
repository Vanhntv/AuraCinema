import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBookingOrder,
  getTicketSummary,
} from "../src/services/bookingViewService.js";

const tickets = [
  {
    _id: "ticket-b",
    ticketCode: "AURA-B2",
    seatLabel: "B2",
    seatType: "VIP",
    price: 70000,
    status: "CHECKED_IN",
    printedAt: new Date("2026-08-18T08:00:00.000Z"),
  },
  {
    _id: "ticket-a",
    ticketCode: "AURA-A1",
    seatLabel: "A1",
    seatType: "Ghế thường",
    price: 50000,
    status: "VALID",
    printedAt: null,
  },
];

test("ticket summary reports per-order lifecycle counts", () => {
  assert.deepEqual(getTicketSummary(tickets), {
    total: 2,
    valid: 1,
    checked_in: 1,
    cancelled: 0,
    expired: 0,
    printed: 1,
    unprinted: 1,
  });
});

test("booking order response groups and sorts child tickets without QR secrets", () => {
  const result = formatBookingOrder({
    _id: "booking-1",
    booking_code: "AURA000000000001",
    ticketing_version: 2,
    order_qr: { token_hash: "secret-hash", token_encrypted: "secret-token" },
    combos: [{ name: "Combo", quantity: 1, subtotal: 100000 }],
  }, tickets);

  assert.deepEqual(result.tickets.map((ticket) => ticket.seat.label), ["A1", "B2"]);
  assert.equal(result.ticket_summary.total, 2);
  assert.equal(result.order_qr, undefined);
  assert.equal(result.tickets[0].qrTokenHash, undefined);
  assert.equal(result.tickets[0].qrTokenEncrypted, undefined);
});
