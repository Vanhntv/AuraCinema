import pdfMake from "pdfmake/build/pdfmake.js";
import unicodeFontUrl from "../assets/fonts/DejaVuSans.ttf?url";

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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const printableValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const getStatusLabel = (status) => ({
  VALID: "Chưa sử dụng",
  CHECKED_IN: "Đã check-in",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
}[status] || printableValue(status));

const assertQrPayload = (qrPayload) => {
  const value = String(qrPayload || "").trim();
  if (!value.startsWith("AURA_TICKET:") || value.length <= "AURA_TICKET:".length) {
    throw new Error("QR vé không hợp lệ. Vui lòng tải lại vé từ hệ thống.");
  }
  return value;
};

const buildDetailRows = (ticket, { includeStatus = true } = {}) => [
  ["Phim", printableValue(ticket.movie?.title)],
  ["Phân loại", printableValue(ticket.movie?.ageClassification || (ticket.movie?.ageLimit ? `T${ticket.movie.ageLimit}` : "P"))],
  ["Ngày chiếu", formatDate(ticket.showtime?.startTime)],
  ["Giờ chiếu", formatTime(ticket.showtime?.startTime)],
  ["Phòng", printableValue(ticket.room?.name)],
  ["Ghế", printableValue(ticket.seat?.label || ticket.seatLabel)],
  ["Loại ghế", printableValue(ticket.seat?.type)],
  ["Giá", currencyFormatter.format(Number(ticket.price || 0))],
  ["Mã Ticket", printableValue(ticket.ticketCode)],
  ["Mã Booking", printableValue(ticket.booking?.bookingCode)],
  ...(includeStatus ? [["Trạng thái", getStatusLabel(ticket.status)]] : []),
];

const buildInfoTable = (rows) => ({
  table: {
    widths: [92, "*"],
    body: rows.map(([label, value]) => [
      { text: label, color: "#64748b", fontSize: 8.5, margin: [0, 2, 0, 2] },
      { text: value, color: "#111827", bold: true, fontSize: 9.5, margin: [0, 2, 0, 2] },
    ]),
  },
  layout: {
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 8,
  },
});

const createTicketPdfDocument = (ticket, qrPayload, options = {}) => ({
  pageSize: "A5",
  pageMargins: [32, 24, 32, 28],
  info: {
    title: `Vé điện tử ${ticket.ticketCode || "AuraCinema"}`,
    author: "AuraCinema",
    subject: "Vé điện tử xem phim",
  },
  defaultStyle: { font: "AuraSans", color: "#111827" },
  content: [
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20 },
            { text: "VÉ ĐIỆN TỬ", color: "#475569", bold: true, fontSize: 10, characterSpacing: 1.4, margin: [0, 4, 0, 0] },
          ],
        },
        {
          width: 92,
          qr: qrPayload,
          fit: 88,
          alignment: "right",
          foreground: "#111827",
          background: "#ffffff",
        },
      ],
      columnGap: 18,
    },
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 355, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }],
      margin: [0, 12, 0, 12],
    },
    buildInfoTable(buildDetailRows(ticket, options)),
    {
      text: "Vui lòng xuất trình mã QR tại cửa phòng chiếu.",
      bold: true,
      fontSize: 9,
      alignment: "center",
      margin: [0, 12, 0, 0],
    },
    {
      text: "Vé đã thanh toán không hỗ trợ khách hàng tự hủy hoặc đổi.",
      color: "#64748b",
      italics: true,
      fontSize: 8,
      alignment: "center",
      margin: [0, 5, 0, 0],
    },
  ],
  footer: (currentPage, pageCount) => ({
    text: `AuraCinema • Trang ${currentPage}/${pageCount}`,
    alignment: "center",
    color: "#94a3b8",
    fontSize: 7,
    margin: [0, 8, 0, 0],
  }),
});

const createTicketPdf = (ticket, qrPayload, options = {}) => {
  if (!ticket) throw new Error("Không có thông tin vé để in.");
  return pdfMake.createPdf(createTicketPdfDocument(ticket, assertQrPayload(qrPayload), options));
};

const getSafeTicketCode = (ticket) => String(ticket?.ticketCode || "ve-aura-cinema")
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, "-");

const printPdfInCurrentPage = (pdfDocument) => new Promise((resolve, reject) => {
  pdfDocument.getBlob((blob) => {
    const pdfUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    let cleanupTimer;
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.clearTimeout(cleanupTimer);
      window.removeEventListener("afterprint", cleanup);
      iframe.remove();
      URL.revokeObjectURL(pdfUrl);
      window.focus();
    };

    iframe.title = "Bản in vé AuraCinema";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.inset = "auto 0 0 auto";
    iframe.style.border = "0";

    iframe.addEventListener("error", () => {
      cleanup();
      reject(new Error("Không thể tải bản in vé."));
    }, { once: true });

    iframe.addEventListener("load", () => {
      window.setTimeout(() => {
        try {
          const printWindow = iframe.contentWindow;
          if (!printWindow) throw new Error("Không thể mở hộp thoại in vé.");

          window.addEventListener("afterprint", cleanup, { once: true });
          cleanupTimer = window.setTimeout(cleanup, 10 * 60 * 1000);
          printWindow.focus();
          printWindow.print();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      }, 250);
    }, { once: true });

    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
  });
});

export const printPdfDefinition = (definition) =>
  printPdfInCurrentPage(pdfMake.createPdf(definition));

export const downloadTicketPdf = (ticket, qrPayload) => new Promise((resolve, reject) => {
  try {
    createTicketPdf(ticket, qrPayload).download(`AuraCinema-${getSafeTicketCode(ticket)}.pdf`, resolve);
  } catch (error) {
    reject(error);
  }
});

export const printTicketPdf = (ticket, qrPayload) => new Promise((resolve, reject) => {
  try {
    printPdfInCurrentPage(
      createTicketPdf(ticket, qrPayload, { includeStatus: false }),
    ).then(resolve, reject);
  } catch (error) {
    reject(error);
  }
});
