import test from "node:test";
import assert from "node:assert/strict";
import { createBookingOrderPrintDefinition } from "./bookingOrderPrint.js";

test("order print definition contains one summary and one page per ticket", () => {
  const definition = createBookingOrderPrintDefinition({
    booking: {
      bookingCode: "AURA000000000001",
      customer: { name: "Nguyen Van A" },
      movie: { title: "Phim" },
      showtime: { start_time: "2026-08-18T10:00:00.000Z", room_name: "Phòng 1", cinema_name: "Aura" },
      services: [{ name: "Combo", quantity: 1, subtotal: 100000 }],
      voucher: { code: "GIAM20", discount_amount: 20000 },
      pricing: { subtotal: 220000, discount: 20000, total: 200000 },
    },
    tickets: [
      { ticketCode: "AURA-A1", seatLabel: "A1", seatType: "VIP", price: 70000, qrPayload: "AURA_TICKET:a1" },
      { ticketCode: "AURA-A2", seatLabel: "A2", seatType: "VIP", price: 70000, qrPayload: "AURA_TICKET:a2" },
    ],
  });

  const text = JSON.stringify(definition);
  assert.match(text, /AURA000000000001/);
  assert.match(text, /GIAM20/);
  assert.equal(definition.content.filter((item) => item.auraTicketPage).length, 2);
  assert.equal(text.includes("AURA_BOOKING_V2:"), false);
});
