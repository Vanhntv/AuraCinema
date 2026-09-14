import test from "node:test";
import assert from "node:assert/strict";
import { createBookingOrderPrintDefinition } from "./bookingOrderPrint.js";

test("order print creates one receipt per booked seat with order-wide summaries", () => {
  const definition = createBookingOrderPrintDefinition({
    booking: {
      bookingCode: "AURA000000000001",
      createdAt: "2026-08-18T08:00:00.000Z",
      customer: { name: "Nguyen Van A" },
      movie: { title: "Phim" },
      showtime: { start_time: "2026-08-18T10:00:00.000Z", room_name: "Phòng 1", cinema_name: "Aura" },
      seats: [
        { seat_label: "A1", seat_type: "VIP", price: 70000 },
        { seat_label: "A2", seat_type: "VIP", price: 70000 },
      ],
      services: [{ name: "Combo", price: 100000, quantity: 1, subtotal: 100000 }],
      voucher: { code: "GIAM20", discount_amount: 20000 },
      pricing: { ticket_subtotal: 140000, service_subtotal: 100000, subtotal: 240000, discount: 20000, total: 220000 },
    },
    tickets: [
      { ticketCode: "AURA-A1", seatLabel: "A1", seatType: "VIP", price: 70000, qrPayload: "AURA_TICKET:a1" },
      { ticketCode: "AURA-A2", seatLabel: "A2", seatType: "VIP", price: 70000, qrPayload: "AURA_TICKET:a2" },
    ],
    printedBy: { accountName: "staff.nguyenvana" },
  });

  const text = JSON.stringify(definition);
  assert.match(text, /AURA000000000001/);
  assert.match(text, /THÔNG TIN SUẤT CHIẾU/);
  assert.match(text, /A1, A2/);
  assert.match(text, /Loại ghế/);
  assert.match(text, /SL dịch vụ/);
  assert.match(text, /Tiền dịch vụ/);
  assert.match(text, /GIAM20/);
  assert.match(text, /THANH TOÁN/);
  assert.match(text, /PHIẾU NHẬN DỊCH VỤ/);
  assert.match(text, /Combo/);
  assert.match(text, /x1/);
  assert.match(text, /Đơn giá:/);
  assert.match(text, /Thành tiền:/);
  assert.match(text, /Nhân viên giao dịch vụ/);
  assert.match(text, /Thời gian giao/);
  assert.match(text, /staff.nguyenvana/);
  assert.equal(text.includes("______________________________"), false);
  assert.equal(text.includes("Rạp"), false);
  assert.equal(text.includes("TÓM TẮT ĐƠN"), false);
  assert.equal(text.includes("Mã vé"), false);
  assert.equal(text.includes("AURA-A1"), false);
  assert.equal(text.includes("AURA-A2"), false);
  assert.equal(text.includes("AURA_TICKET:"), false);
  assert.equal(text.includes('"qr"'), false);
  assert.equal(text.includes("SỐ GHẾ"), false);
  assert.equal(text.includes("GHẾ TRONG ĐƠN"), false);
  assert.equal(text.includes("Tổng số ghế"), false);
  assert.equal(definition.content[0].stack[0].stack[0].alignment, "center");
  assert.equal(definition.content[0].stack[0].stack[1].alignment, "center");
  assert.equal(definition.content.filter((item) => item.auraTicketPage).length, 2);
  assert.equal(definition.content.filter((item) => item.auraServicePage).length, 1);
  assert.equal(definition.content[0].pageBreak, undefined);
  assert.equal(definition.content[1].pageBreak, "before");
  assert.equal(definition.content[2].pageBreak, "before");
  assert.equal(definition.content.length, 3);
  assert.equal(text.includes("AURA_BOOKING_V2:"), false);
});

test("order without services does not print a service receipt", () => {
  const definition = createBookingOrderPrintDefinition({
    booking: { bookingCode: "AURA-NO-SERVICE", services: [] },
    tickets: [{ seatLabel: "A1", qrPayload: "AURA_TICKET:a1" }],
  });

  assert.equal(definition.content.length, 1);
  assert.equal(definition.content.some((item) => item.auraServicePage), false);
});
