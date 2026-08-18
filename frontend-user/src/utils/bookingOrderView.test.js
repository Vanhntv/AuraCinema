import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingOrderQrFilename,
  isBookingOrderExpanded,
  mapBookingOrderView,
  toggleBookingOrderExpanded,
} from "./bookingOrderView.js";

test("booking order view keeps one order and sorts its child tickets", () => {
  const result = mapBookingOrderView({
    _id: "booking-1",
    booking_code: "AURA000000000001",
    movie_snapshot: { title: "Phim", poster: "/poster.jpg", age_classification: "T13" },
    showtime_snapshot: { start_time: "2026-08-18T10:00:00.000Z", room_name: "Phòng 1", cinema_name: "Aura" },
    combos: [{ combo_id: "combo-1", name: "Combo", price: 50000, quantity: 2, subtotal: 100000 }],
    voucher: { code: "GIAM20", discount_amount: 20000 },
    pricing: { ticket_subtotal: 120000, service_subtotal: 100000, subtotal: 220000, discount: 20000, total: 200000 },
    tickets: [
      { id: "ticket-b", ticketCode: "B", seat: { label: "B2" }, status: "VALID" },
      { id: "ticket-a", ticketCode: "A", seat: { label: "A1" }, status: "VALID" },
    ],
  });

  assert.equal(result.bookingCode, "AURA000000000001");
  assert.equal(result.services[0].subtotal, 100000);
  assert.equal(result.voucher.code, "GIAM20");
  assert.equal(result.pricing.total, 200000);
  assert.deepEqual(result.tickets.map((ticket) => ticket.seat.label), ["A1", "B2"]);
});

test("booking orders are collapsed by default and toggle independently", () => {
  const initialState = new Set();
  assert.equal(isBookingOrderExpanded(initialState, "booking-1"), false);

  const expandedState = toggleBookingOrderExpanded(initialState, "booking-1");
  assert.equal(isBookingOrderExpanded(expandedState, "booking-1"), true);
  assert.equal(isBookingOrderExpanded(expandedState, "booking-2"), false);
  assert.equal(initialState.size, 0);

  const collapsedState = toggleBookingOrderExpanded(expandedState, "booking-1");
  assert.equal(isBookingOrderExpanded(collapsedState, "booking-1"), false);
});

test("order QR download filename is safe and derived from the booking code", () => {
  assert.equal(buildBookingOrderQrFilename("AURA 123/456"), "AURA-123-456-qr-don-ve.png");
  assert.equal(buildBookingOrderQrFilename(""), "don-ve-qr-don-ve.png");
});
