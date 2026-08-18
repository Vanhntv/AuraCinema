const toPlainObject = (value) => {
  if (!value) return {};
  return typeof value.toObject === "function" ? value.toObject() : { ...value };
};

const getId = (value) => value?._id || value || null;

export const getTicketSummary = (tickets = []) => ({
  total: tickets.length,
  valid: tickets.filter((ticket) => ticket.status === "VALID").length,
  checked_in: tickets.filter((ticket) => ticket.status === "CHECKED_IN").length,
  cancelled: tickets.filter((ticket) => ticket.status === "CANCELLED").length,
  expired: tickets.filter((ticket) => ticket.status === "EXPIRED").length,
  printed: tickets.filter((ticket) => Boolean(ticket.printedAt)).length,
  unprinted: tickets.filter((ticket) => ticket.status === "VALID" && !ticket.printedAt).length,
});

export const formatBookingOrderTicket = (ticketValue) => {
  const ticket = toPlainObject(ticketValue);
  const seat = ticket.seatId || {};
  const movie = ticket.movieId || {};
  const showtime = ticket.showtimeId || {};
  const room = ticket.roomId || {};
  const cinema = room.cinema_id || {};

  return {
    id: ticket._id,
    ticketCode: ticket.ticketCode,
    movie: movie?._id ? { id: movie._id, title: movie.title, poster: movie.poster } : null,
    showtime: showtime?._id
      ? { id: showtime._id, startTime: showtime.start_time, endTime: showtime.end_time }
      : null,
    room: room?._id ? { id: room._id, name: room.name } : null,
    cinema: cinema?._id
      ? { id: cinema._id, name: cinema.name, address: cinema.address }
      : null,
    seat: {
      id: getId(seat),
      label: ticket.seatLabel,
      row: seat.seat_row || "",
      number: seat.seat_number ?? null,
      type: ticket.seatType || seat.seat_type_id?.name || "",
    },
    price: Number(ticket.price || 0),
    status: ticket.status,
    printedAt: ticket.printedAt || null,
    checkedInAt: ticket.checkedInAt || null,
    createdAt: ticket.createdAt || null,
  };
};

export const formatBookingOrder = (bookingValue, ticketValues = []) => {
  const booking = toPlainObject(bookingValue);
  delete booking.order_qr;

  const tickets = [...ticketValues]
    .sort((first, second) => String(first.seatLabel || "").localeCompare(String(second.seatLabel || "")))
    .map(formatBookingOrderTicket);

  return {
    ...booking,
    tickets,
    ticket_summary: getTicketSummary(ticketValues),
  };
};

export const populateBookingOrderTickets = (query) =>
  query
    .populate("movieId", "title poster age_limit duration")
    .populate("showtimeId", "start_time end_time")
    .populate({
      path: "roomId",
      select: "name cinema_id",
      populate: { path: "cinema_id", select: "name address" },
    })
    .populate({
      path: "seatId",
      select: "seat_row seat_number seat_code seat_type_id",
      populate: { path: "seat_type_id", select: "name" },
    });
