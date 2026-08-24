const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const printable = (value) => value === null || value === undefined || value === "" ? "-" : String(value);

const numberValue = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

const formatOrderSeats = (seats = []) => {
  const text = seats
    .map((seat) => {
      const label = seat.seat_label || seat.seatLabel || seat.label || seat.seat_code || seat.seatCode || "";
      const type = seat.seat_type || seat.seatType || seat.type || "";
      if (!label) return "";
      return type ? `${label} - ${type}` : label;
    })
    .filter(Boolean)
    .join(", ");

  return text || "Không có dữ liệu ghế";
};

const formatServices = (services = []) => {
  const text = services
    .map((item) => {
      const quantity = Math.max(Math.trunc(numberValue(item.quantity, 1)), 1);
      const subtotal = numberValue(item.subtotal, numberValue(item.price) * quantity);
      const priceText = subtotal > 0 ? ` (${currencyFormatter.format(subtotal)})` : "";
      return `${item.name || "Dịch vụ"} x${quantity}${priceText}`;
    })
    .filter(Boolean)
    .join(", ");

  return text || "Không có";
};

const formatVoucher = (booking = {}) => {
  const code = String(booking.voucher?.code || "").trim().toUpperCase();
  const discount = numberValue(booking.pricing?.discount ?? booking.voucher?.discount_amount ?? booking.voucher?.discountAmount);
  if (!code && discount <= 0) return "Không áp dụng";
  if (!code) return `-${currencyFormatter.format(discount)}`;
  return discount > 0 ? `${code} (-${currencyFormatter.format(discount)})` : code;
};

const infoTable = (rows, widths = [92, "*"]) => ({
  table: {
    widths,
    body: rows.map(([label, value]) => [
      { text: label, color: "#64748b", fontSize: 8.2, margin: [0, 2, 0, 2] },
      { text: printable(value), bold: true, fontSize: 8.8, margin: [0, 2, 0, 2] },
    ]),
  },
  layout: {
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 8,
  },
});

export const createBookingOrderPrintDefinition = (payload = {}) => {
  const booking = payload.booking || {};
  const services = booking.services || [];
  const orderSummaryRows = [
    ["Mã đơn", booking.bookingCode],
    ["Khách hàng", booking.customer?.name],
    ["Ghế trong đơn", formatOrderSeats(booking.seats)],
    ["Dịch vụ", formatServices(services)],
    ["Mã giảm giá", formatVoucher(booking)],
    ["Tổng thanh toán", currencyFormatter.format(numberValue(booking.pricing?.total || booking.total_price))],
    ["Phương thức", booking.payment?.provider],
  ];
  const ticketPages = (payload.tickets || []).map((ticket, index) => ({
    auraTicketPage: true,
    ...(index > 0 ? { pageBreak: "before" } : {}),
    stack: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20 },
              { text: `VÉ ${printable(ticket.seatLabel)}`, bold: true, fontSize: 16, margin: [0, 8, 0, 0] },
              { text: `Đơn ${printable(booking.bookingCode)}`, color: "#64748b", fontSize: 9, margin: [0, 4, 0, 0] },
            ],
          },
          { width: 104, qr: ticket.qrPayload, fit: 100, alignment: "right" },
        ],
      },
      { text: "THÔNG TIN VÉ", bold: true, color: "#e11d48", fontSize: 9, margin: [0, 14, 0, 5] },
      {
        margin: [0, 0, 0, 0],
        ...infoTable([
          ["Mã vé", ticket.ticketCode],
          ["Phim", booking.movie?.title],
          ["Suất chiếu", formatDateTime(booking.showtime?.start_time)],
          ["Phòng", booking.showtime?.room_name],
          ["Ghế", ticket.seatLabel],
          ["Loại ghế", ticket.seatType],
          ["Giá vé", currencyFormatter.format(numberValue(ticket.price))],
        ]),
      },
      { text: "TÓM TẮT ĐƠN", bold: true, color: "#e11d48", fontSize: 9, margin: [0, 10, 0, 5] },
      infoTable(orderSummaryRows),
      { text: "Xuất trình QR vé này tại cửa phòng chiếu để check-in.", alignment: "center", bold: true, margin: [0, 12, 0, 0] },
    ],
  }));

  return {
    pageSize: "A5",
    pageMargins: [32, 28, 32, 30],
    info: { title: `Đơn vé ${booking.bookingCode || "AuraCinema"}`, author: "AuraCinema" },
    defaultStyle: { font: "AuraSans", color: "#111827", fontSize: 9 },
    content: ticketPages,
  };
};

export const printBookingOrder = async (payload) => {
  const { printPdfDefinition } = await import("./ticketPdf.js");
  return printPdfDefinition(createBookingOrderPrintDefinition(payload));
};
