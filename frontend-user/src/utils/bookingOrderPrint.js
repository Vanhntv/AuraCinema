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

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
};

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const getServiceQuantity = (service = {}) =>
  Math.max(Math.trunc(numberValue(service.quantity, 1)), 1);

const getServiceSubtotal = (service = {}) =>
  numberValue(service.subtotal, numberValue(service.price) * getServiceQuantity(service));

const getSeatLabel = (seat = {}) =>
  seat.seat_label || seat.seatLabel || seat.label || seat.seat_code || seat.seatCode || "";

const getSeatType = (seat = {}) =>
  seat.seat_type || seat.seatType || seat.type || "Không xác định";

const getSeatPrice = (seat = {}) => numberValue(seat.price);

const formatSeatList = (seats = []) =>
  seats.map(getSeatLabel).filter(Boolean).join(", ") || "Không có dữ liệu ghế";

const groupSeatsByTypeAndPrice = (seats = []) => {
  const groups = new Map();
  seats.forEach((seat) => {
    const type = getSeatType(seat);
    const price = getSeatPrice(seat);
    const key = `${type}:${price}`;
    const current = groups.get(key) || { type, price, quantity: 0 };
    current.quantity += 1;
    groups.set(key, current);
  });
  return [...groups.values()];
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

const detailGrid = (rows) => ({
  table: {
    widths: [58, "*", 58, "*"],
    body: rows.map(([firstLabel, firstValue, secondLabel, secondValue]) => [
      { text: firstLabel, color: "#64748b", fontSize: 8, margin: [0, 4, 0, 4] },
      { text: printable(firstValue), bold: true, fontSize: 9, margin: [0, 4, 8, 4] },
      { text: secondLabel, color: "#64748b", fontSize: 8, margin: [0, 4, 0, 4] },
      { text: printable(secondValue), bold: true, fontSize: 9, margin: [0, 4, 0, 4] },
    ]),
  },
  layout: {
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 4,
  },
});

const sectionTitle = (text) => ({
  text,
  bold: true,
  color: "#e11d48",
  fontSize: 9,
  margin: [0, 14, 0, 5],
});

const seatPriceTable = (groups) => ({
  table: {
    headerRows: 1,
    widths: ["*", 72, 34, 78],
    body: [
      ["Loại ghế", "Đơn giá", "SL", "Thành tiền"].map((text) => ({
        text,
        bold: true,
        color: "#64748b",
        fontSize: 8,
        margin: [0, 4, 0, 4],
      })),
      ...groups.map((group) => [
        { text: group.type, bold: true, fontSize: 9, margin: [0, 4, 0, 4] },
        { text: currencyFormatter.format(group.price), fontSize: 9, margin: [0, 4, 0, 4] },
        { text: group.quantity, alignment: "center", fontSize: 9, margin: [0, 4, 0, 4] },
        { text: currencyFormatter.format(group.price * group.quantity), bold: true, alignment: "right", fontSize: 9, margin: [0, 4, 0, 4] },
      ]),
    ],
  },
  layout: {
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 4,
  },
});

const serviceItemsTable = (services) => ({
  table: {
    widths: ["*", 112],
    body: services.flatMap((service) => {
      const quantity = getServiceQuantity(service);
      const subtotal = getServiceSubtotal(service);
      const unitPrice = numberValue(service.price, subtotal / quantity);
      return [
        [
          { text: service.name || "Dịch vụ", bold: true, fontSize: 9.5, margin: [0, 6, 0, 1] },
          { text: `x${quantity}`, bold: true, fontSize: 10, alignment: "right", margin: [0, 6, 0, 1] },
        ],
        [
          { text: `Đơn giá: ${currencyFormatter.format(unitPrice)}`, color: "#64748b", fontSize: 8.5, margin: [0, 1, 0, 6] },
          { text: `Thành tiền: ${currencyFormatter.format(subtotal)}`, bold: true, fontSize: 8.5, alignment: "right", margin: [0, 1, 0, 6] },
        ],
      ];
    }),
  },
  layout: {
    hLineWidth: (rowIndex) => rowIndex > 0 && rowIndex % 2 === 0 ? 1 : 0,
    hLineColor: () => "#e2e8f0",
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
});

export const createBookingOrderPrintDefinition = (payload = {}) => {
  const booking = payload.booking || {};
  const services = booking.services || [];
  const seats = booking.seats || [];
  const seatGroups = groupSeatsByTypeAndPrice(seats);
  const serviceQuantity = services.reduce((total, service) => total + getServiceQuantity(service), 0);
  const serviceTotal = numberValue(
    booking.pricing?.service_subtotal,
    services.reduce((total, service) => total + getServiceSubtotal(service), 0),
  );
  const printedAt = new Date();
  const printedAtText = formatDateTime(printedAt);
  const printOperator = printable(payload.printedBy?.accountName);
  const printableTicketCount = (payload.tickets || []).length;
  const receiptCount = printableTicketCount > 0 ? seats.length || printableTicketCount : 0;
  const ticketPages = Array.from({ length: receiptCount }, (_, index) => ({
    auraTicketPage: true,
    ...(index > 0 ? { pageBreak: "before" } : {}),
    stack: [
      {
        stack: [
          { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20, alignment: "center" },
          { text: "PHIẾU VÉ XEM PHIM", bold: true, fontSize: 12, alignment: "center", margin: [0, 4, 0, 0] },
        ],
        margin: [0, 0, 0, 4],
      },
      sectionTitle("THÔNG TIN ĐƠN"),
      infoTable([
        ["Mã đơn", booking.bookingCode],
        ["Khách hàng", booking.customer?.name],
        ["Ngày đặt", formatDateTime(booking.createdAt)],
      ]),
      sectionTitle("THÔNG TIN SUẤT CHIẾU"),
      { text: printable(booking.movie?.title), bold: true, fontSize: 15, margin: [0, 0, 0, 6] },
      detailGrid([
        ["Phân loại", booking.movie?.age_classification, "Phòng", booking.showtime?.room_name],
        ["Ngày chiếu", formatDate(booking.showtime?.start_time), "Suất chiếu", formatTime(booking.showtime?.start_time)],
      ]),
      infoTable([
        ["Danh sách ghế", formatSeatList(seats)],
      ]),
      seatPriceTable(seatGroups),
      sectionTitle("DỊCH VỤ & ƯU ĐÃI"),
      detailGrid([
        ["SL dịch vụ", serviceQuantity, "Tiền dịch vụ", currencyFormatter.format(serviceTotal)],
        ["Mã giảm giá", booking.voucher?.code || "Không áp dụng", "Giảm giá", `-${currencyFormatter.format(numberValue(booking.pricing?.discount))}`],
      ]),
      sectionTitle("THANH TOÁN"),
      detailGrid([
        ["Tạm tính", currencyFormatter.format(numberValue(booking.pricing?.subtotal || booking.total_price)), "Tổng đơn", currencyFormatter.format(numberValue(booking.pricing?.total || booking.total_price))],
        ["Phương thức", booking.payment?.provider, "Mã giao dịch", booking.payment?.transactionId],
        ["Thời gian in", printedAtText, "Nhân viên in", printOperator],
      ]),
      { text: "Mã đơn dùng để đối chiếu vé và dịch vụ.", alignment: "center", bold: true, margin: [0, 18, 0, 0] },
      { text: "Vui lòng kiểm tra đúng phim, suất chiếu, phòng và ghế trước khi vào rạp.", alignment: "center", color: "#64748b", fontSize: 8, margin: [0, 5, 0, 0] },
      { text: "Cảm ơn bạn đã sử dụng Aura Cinema!", alignment: "center", color: "#e11d48", bold: true, margin: [0, 12, 0, 0] },
    ],
  }));

  const servicePage = services.length > 0 ? {
    auraServicePage: true,
    pageBreak: "before",
    stack: [
      { text: "AURA CINEMA", color: "#e11d48", bold: true, fontSize: 20, alignment: "center" },
      { text: "PHIẾU NHẬN DỊCH VỤ", bold: true, fontSize: 13, alignment: "center", margin: [0, 6, 0, 0] },
      { text: `Mã đơn: ${printable(booking.bookingCode)}`, bold: true, fontSize: 10, alignment: "center", margin: [0, 6, 0, 0] },
      { text: "THÔNG TIN PHIẾU", bold: true, color: "#e11d48", fontSize: 9, margin: [0, 14, 0, 5] },
      infoTable([
        ["Khách hàng", booking.customer?.name],
        ["Nhân viên in", printOperator],
        ["Thời gian in", printedAtText],
      ]),
      { text: "DỊCH VỤ ĐÃ ĐẶT", bold: true, color: "#e11d48", fontSize: 9, margin: [0, 14, 0, 5] },
      serviceItemsTable(services),
      { text: "TỔNG KẾT", bold: true, color: "#e11d48", fontSize: 9, margin: [0, 14, 0, 5] },
      infoTable([
        ["Tổng số lượng", services.reduce((total, service) => total + getServiceQuantity(service), 0)],
        ["Tổng tiền dịch vụ", currencyFormatter.format(numberValue(
          booking.pricing?.service_subtotal,
          services.reduce((total, service) => total + getServiceSubtotal(service), 0),
        ))],
      ]),
      infoTable([
        ["Nhân viên giao dịch vụ", printOperator],
        ["Thời gian giao", printedAtText],
      ]),
      { text: "Phiếu này chỉ dùng để nhận đồ ăn và thức uống.", alignment: "center", bold: true, margin: [0, 22, 0, 0] },
      { text: "Mã đơn phải trùng với mã đơn trên phiếu vé.", alignment: "center", margin: [0, 5, 0, 0] },
    ],
  } : null;

  return {
    pageSize: "A5",
    pageMargins: [32, 28, 32, 30],
    info: { title: `Đơn vé ${booking.bookingCode || "AuraCinema"}`, author: "AuraCinema" },
    defaultStyle: { font: "AuraSans", color: "#111827", fontSize: 9 },
    content: servicePage ? [...ticketPages, servicePage] : ticketPages,
  };
};

export const printBookingOrder = async (payload) => {
  const { printPdfDefinition } = await import("./ticketPdf.js");
  return printPdfDefinition(createBookingOrderPrintDefinition(payload));
};
