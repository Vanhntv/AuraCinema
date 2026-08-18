const numberValue = (value) => Number(value || 0);

export const isBookingOrderExpanded = (expandedOrderIds, orderId) =>
  Boolean(orderId && expandedOrderIds?.has(orderId));

export const toggleBookingOrderExpanded = (expandedOrderIds, orderId) => {
  const nextExpandedOrderIds = new Set(expandedOrderIds || []);
  if (!orderId) return nextExpandedOrderIds;

  if (nextExpandedOrderIds.has(orderId)) {
    nextExpandedOrderIds.delete(orderId);
  } else {
    nextExpandedOrderIds.add(orderId);
  }

  return nextExpandedOrderIds;
};

export const buildBookingOrderQrFilename = (bookingCode) => {
  const safeCode = String(bookingCode || "don-ve")
    .trim()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeCode || "don-ve"}-qr-don-ve.png`;
};

export const mapBookingOrderView = (booking = {}) => {
  const populatedShowtime = booking.showtime_id || {};
  const populatedMovie = populatedShowtime.movie_id || {};
  const populatedRoom = populatedShowtime.room_id || {};
  const populatedCinema = populatedRoom.cinema_id || {};
  const movie = booking.movie_snapshot || {};
  const showtime = booking.showtime_snapshot || {};
  const tickets = [...(booking.tickets || [])].sort((first, second) =>
    String(first.seat?.label || "").localeCompare(String(second.seat?.label || "")));

  return {
    raw: booking,
    id: booking._id || booking.id,
    bookingCode: booking.booking_code || booking.bookingCode || "",
    ticketingVersion: Number(booking.ticketing_version || 1),
    status: booking.status,
    paymentStatus: booking.payment_status,
    movie: {
      id: movie.movie_id || populatedMovie._id || null,
      title: movie.title || populatedMovie.title || tickets[0]?.movie?.title || "",
      poster: movie.poster || populatedMovie.poster || tickets[0]?.movie?.poster || "",
      ageClassification: movie.age_classification
        || (Number(populatedMovie.age_limit) > 0 ? `T${populatedMovie.age_limit}` : "P"),
    },
    showtime: {
      id: showtime.showtime_id || populatedShowtime._id || null,
      startTime: showtime.start_time || populatedShowtime.start_time || tickets[0]?.showtime?.startTime || null,
      endTime: showtime.end_time || populatedShowtime.end_time || tickets[0]?.showtime?.endTime || null,
    },
    cinema: {
      id: showtime.cinema_id || populatedCinema._id || tickets[0]?.cinema?.id || null,
      name: showtime.cinema_name || populatedCinema.name || tickets[0]?.cinema?.name || "",
      address: showtime.cinema_address || populatedCinema.address || tickets[0]?.cinema?.address || "",
    },
    room: {
      id: showtime.room_id || populatedRoom._id || tickets[0]?.room?.id || null,
      name: showtime.room_name || populatedRoom.name || tickets[0]?.room?.name || "",
    },
    services: (booking.combos || []).map((service) => ({
      id: service.combo_id?._id || service.combo_id || service._id,
      name: service.name || service.combo_id?.name || "Dịch vụ",
      unitPrice: numberValue(service.price),
      quantity: numberValue(service.quantity),
      subtotal: numberValue(service.subtotal),
    })),
    voucher: booking.voucher?.code ? {
      code: booking.voucher.code,
      discountAmount: numberValue(booking.voucher.discount_amount || booking.discount_amount),
    } : null,
    pricing: {
      ticketSubtotal: numberValue(booking.pricing?.ticket_subtotal),
      serviceSubtotal: numberValue(booking.pricing?.service_subtotal),
      subtotal: numberValue(booking.pricing?.subtotal || booking.subtotal_price),
      discount: numberValue(booking.pricing?.discount || booking.discount_amount),
      total: numberValue(booking.pricing?.total || booking.total_price),
    },
    ticketSummary: booking.ticket_summary || null,
    tickets,
  };
};
