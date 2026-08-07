import pdfMake from "pdfmake/build/pdfmake.js";
import unicodeFontUrl from "../../assets/fonts/DejaVuSans.ttf?url";

const resolveFontUrl = (fontUrl) => new URL(fontUrl, window.location.origin).href;

pdfMake.addFonts({
  AuraSans: {
    normal: resolveFontUrl(unicodeFontUrl),
    bold: resolveFontUrl(unicodeFontUrl),
    italics: resolveFontUrl(unicodeFontUrl),
    bolditalics: resolveFontUrl(unicodeFontUrl),
  },
});

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const printableValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const buildDetailRows = (ticket) => [
  ["Phim", printableValue(ticket.movie?.title)],
  ["Suất chiếu", formatDateTime(ticket.showtime?.startTime)],
  ["Phòng chiếu", printableValue(ticket.room?.name)],
  ["Ghế", printableValue(ticket.seat?.label || ticket.seatLabel)],
  ["Loại ghế", printableValue(ticket.seat?.type)],
  ["Giá vé", currencyFormatter.format(Number(ticket.price || 0))],
  ["Mã đơn hàng", printableValue(ticket.booking?.bookingCode)],
];

const buildInfoTable = (rows) => ({
  table: {
    widths: [105, "*"],
    body: rows.map(([label, value]) => [
      { text: label, color: "#64748b", fontSize: 9, margin: [0, 2, 0, 2] },
      { text: value, color: "#111827", bold: true, fontSize: 10, margin: [0, 2, 0, 2] },
    ]),
  },
  layout: {
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 8,
  },
});

const createTicketPdfDocument = (ticket, qrToken) => {
  const detailRows = buildDetailRows(ticket);

  return {
    pageSize: "A5",
    pageMargins: [32, 24, 32, 24],
    info: {
      title: `Vé điện tử ${ticket.ticketCode || "Aura Cinema"}`,
      author: "Aura Cinema",
      subject: "Thông tin vé xem phim",
    },
    defaultStyle: {
      font: "AuraSans",
      color: "#111827",
    },
    content: [
      {
        columns: [
          {
            width: 245,
            stack: [
              { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20 },
              { text: "VÉ ĐIỆN TỬ", color: "#475569", bold: true, fontSize: 10, characterSpacing: 1.5, margin: [0, 4, 0, 0] },
            ],
          },
          qrToken
            ? {
              width: 86,
              qr: qrToken,
              fit: 82,
              alignment: "right",
              foreground: "#111827",
              background: "#ffffff",
            }
            : { width: 0, text: "" },
        ],
        columnGap: 20,
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 355, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }],
        margin: [0, 12, 0, 12],
      },
      { text: "MÃ VÉ", color: "#64748b", bold: true, fontSize: 8, characterSpacing: 1.2 },
      { text: printableValue(ticket.ticketCode), color: "#e11d48", bold: true, fontSize: 17, margin: [0, 3, 0, 10] },
      buildInfoTable(detailRows),
      ...(ticket.checkedInAt
        ? [
          {
            text: `Thời gian check-in: ${formatDateTime(ticket.checkedInAt)}`,
            color: "#047857",
            bold: true,
            fontSize: 9,
            margin: [0, 10, 0, 0],
          },
        ]
        : []),
      {
        text: "Vui lòng giữ vé này để đối chiếu khi cần thiết.",
        color: "#64748b",
        italics: true,
        fontSize: 8,
        alignment: "center",
        margin: [0, 10, 0, 0],
      },
    ],
    footer: (currentPage, pageCount) => ({
      text: `Aura Cinema  •  Trang ${currentPage}/${pageCount}`,
      alignment: "center",
      color: "#94a3b8",
      fontSize: 7,
      margin: [0, 8, 0, 0],
    }),
  };
};

const createTicketPdf = (ticket, qrToken) => {
  if (!ticket) throw new Error("Không có thông tin vé để in.");

  return pdfMake.createPdf(
    createTicketPdfDocument(ticket, String(qrToken || "").trim()),
  );
};

export const downloadTicketPdf = (ticket, qrToken) =>
  new Promise((resolve, reject) => {
    if (!ticket) {
      reject(new Error("Không có thông tin vé để in."));
      return;
    }

    try {
      const safeTicketCode = String(ticket.ticketCode || "ve-aura-cinema")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "-");

      createTicketPdf(ticket, qrToken).download(`${safeTicketCode}.pdf`, resolve);
    } catch (error) {
      reject(error);
    }
  });
