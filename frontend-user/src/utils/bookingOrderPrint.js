const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const printable = (value) => value === null || value === undefined || value === "" ? "-" : String(value);

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

const infoTable = (rows) => ({
  table: {
    widths: [115, "*"],
    body: rows.map(([label, value]) => [
      { text: label, color: "#64748b", margin: [0, 3, 0, 3] },
      { text: printable(value), bold: true, margin: [0, 3, 0, 3] },
    ]),
  },
  layout: "lightHorizontalLines",
});

export const createBookingOrderPrintDefinition = (payload = {}) => {
  const booking = payload.booking || {};
  const services = booking.services || [];
  const voucher = booking.voucher?.code
    ? `${booking.voucher.code} (−${currencyFormatter.format(Number(booking.voucher.discount_amount || booking.voucher.discountAmount || 0))})`
    : "Không áp dụng";
  const summaryRows = [
    ["Mã đơn", booking.bookingCode],
    ["Khách hàng", booking.customer?.name],
    ["Phim", booking.movie?.title],
    ["Suất chiếu", formatDateTime(booking.showtime?.start_time)],
    ["Rạp / Phòng", `${printable(booking.showtime?.cinema_name)} / ${printable(booking.showtime?.room_name)}`],
    ["Dịch vụ", services.length ? services.map((item) => `${item.name} ×${item.quantity} (${currencyFormatter.format(Number(item.subtotal || 0))})`).join(", ") : "Không có"],
    ["Mã giảm giá", voucher],
    ["Tạm tính", currencyFormatter.format(Number(booking.pricing?.subtotal || 0))],
    ["Giảm giá", currencyFormatter.format(Number(booking.pricing?.discount || 0))],
    ["Tổng thanh toán", currencyFormatter.format(Number(booking.pricing?.total || 0))],
    ["Phương thức", booking.payment?.provider],
  ];
  const ticketPages = (payload.tickets || []).map((ticket) => ({
    auraTicketPage: true,
    pageBreak: "before",
    stack: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20 },
              { text: `VÉ ${printable(ticket.seatLabel)}`, bold: true, fontSize: 16, margin: [0, 8, 0, 0] },
            ],
          },
          { width: 120, qr: ticket.qrPayload, fit: 112, alignment: "right" },
        ],
      },
      {
        margin: [0, 18, 0, 0],
        ...infoTable([
          ["Mã vé", ticket.ticketCode],
          ["Phim", booking.movie?.title],
          ["Suất chiếu", formatDateTime(booking.showtime?.start_time)],
          ["Rạp / Phòng", `${printable(booking.showtime?.cinema_name)} / ${printable(booking.showtime?.room_name)}`],
          ["Ghế", ticket.seatLabel],
          ["Loại ghế", ticket.seatType],
          ["Giá vé", currencyFormatter.format(Number(ticket.price || 0))],
        ]),
      },
      { text: "Xuất trình QR vé này tại cửa phòng chiếu để check-in.", alignment: "center", bold: true, margin: [0, 18, 0, 0] },
    ],
  }));

  return {
    pageSize: "A5",
    pageMargins: [32, 28, 32, 30],
    info: { title: `Đơn vé ${booking.bookingCode || "AuraCinema"}`, author: "AuraCinema" },
    defaultStyle: { font: "AuraSans", color: "#111827", fontSize: 9 },
    content: [
      { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 22 },
      { text: "TÓM TẮT ĐƠN VÉ", bold: true, fontSize: 14, margin: [0, 6, 0, 18] },
      infoTable(summaryRows),
      ...ticketPages,
    ],
  };
};

export const printBookingOrder = async (payload) => {
  const { printPdfDefinition } = await import("./ticketPdf.js");
  return printPdfDefinition(createBookingOrderPrintDefinition(payload));
};
