import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import {
  buildTicketQrPayload,
  createTicketsForPaidBooking,
  decryptQrToken,
} from "../services/ticketService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const resolvePosterUrl = (poster) => poster || null;

const expireEndedTickets = async (tickets, now = new Date()) => {
  const expiringIds = tickets
    .filter((ticket) => {
      const showtime = ticket.showtimeId || {};
      const configuredEndTime = showtime.end_time ? new Date(showtime.end_time) : null;
      const startTime = showtime.start_time ? new Date(showtime.start_time) : null;
      const duration = Number(ticket.movieId?.duration || 0);
      const calculatedEndTime = startTime && !Number.isNaN(startTime.getTime()) && duration > 0
        ? new Date(startTime.getTime() + duration * 60 * 1000)
        : null;
      const endTime = configuredEndTime && !Number.isNaN(configuredEndTime.getTime())
        ? configuredEndTime
        : calculatedEndTime;
      return ticket.status === "VALID"
        && endTime
        && !Number.isNaN(endTime.getTime())
        && endTime < now;
    })
    .map((ticket) => ticket._id);

  if (!expiringIds.length) return tickets;

  await Ticket.updateMany(
    { _id: { $in: expiringIds }, status: "VALID" },
    { $set: { status: "EXPIRED" } },
  );

  const expiringIdSet = new Set(expiringIds.map(String));
  tickets.forEach((ticket) => {
    if (expiringIdSet.has(String(ticket._id)) && ticket.status === "VALID") {
      ticket.status = "EXPIRED";
    }
  });

  return tickets;
};

export const formatTicketForOwner = (ticket) => {
  const movie = ticket.movieId || {};
  const showtime = ticket.showtimeId || {};
  const room = ticket.roomId || {};
  const cinema = room.cinema_id || {};
  const seat = ticket.seatId || {};
  const booking = ticket.bookingId || {};

  return {
    id: ticket._id,
    ticketCode: ticket.ticketCode,
    booking: booking?._id
      ? {
        id: booking._id,
        bookingCode: booking.booking_code,
        status: booking.status,
        paymentStatus: booking.payment_status,
        paidAt: booking.paid_at,
      }
      : null,
    movie: movie?._id
      ? {
        id: movie._id,
        title: movie.title,
        poster: resolvePosterUrl(movie.poster),
        ageClassification: Number(movie.age_limit) > 0 ? `T${movie.age_limit}` : "P",
        ageLimit: movie.age_limit ?? null,
      }
      : null,
    showtime: showtime?._id
      ? {
        id: showtime._id,
        startTime: showtime.start_time,
        endTime: showtime.end_time,
      }
      : null,
    room: room?._id
      ? {
        id: room._id,
        name: room.name,
      }
      : null,
    cinema: cinema?._id
      ? {
        id: cinema._id,
        name: cinema.name,
        address: cinema.address,
      }
      : null,
    seat: {
      id: seat?._id || ticket.seatId,
      label: ticket.seatLabel,
      row: seat.seat_row || "",
      number: seat.seat_number ?? null,
      type: seat.seat_type_id?.name || "",
    },
    price: ticket.price,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
};

const populateTicketQuery = (query) =>
  query
    .populate("bookingId", "booking_code status payment_status paid_at")
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

const getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getTicketForOwner = async ({ ticketId, userId, includeQrToken = false }) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw Object.assign(new Error("ID vé không hợp lệ"), { statusCode: 400 });
  }

  let query = Ticket.findOne({
    _id: ticketId,
    userId,
  });

  query = includeQrToken
    ? query.select("+qrTokenEncrypted -qrTokenHash")
    : query.select("-qrTokenHash");

  return populateTicketQuery(query);
};

export const getMyTickets = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { userId: req.user.id };

    const [tickets, totalItems] = await Promise.all([
      populateTicketQuery(
        Ticket.find(filter)
          .select("-qrTokenHash")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ),
      Ticket.countDocuments(filter),
    ]);

    await expireEndedTickets(tickets);

    return res.json({
      success: true,
      message: "Lấy danh sách vé thành công",
      data: tickets.map(formatTicketForOwner),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách vé",
    });
  }
};

export const getMyTicketDetail = async (req, res) => {
  try {
    const ticket = await getTicketForOwner({
      ticketId: req.params.ticketId,
      userId: req.user.id,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vé",
      });
    }

    await expireEndedTickets([ticket]);

    return res.json({
      success: true,
      message: "Lấy thông tin vé thành công",
      data: formatTicketForOwner(ticket),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Không thể lấy thông tin vé" : error.message,
    });
  }
};

export const getMyTicketQr = async (req, res) => {
  try {
    const ticket = await getTicketForOwner({
      ticketId: req.params.ticketId,
      userId: req.user.id,
      includeQrToken: true,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vé",
      });
    }

    await expireEndedTickets([ticket]);

    if (["CANCELLED", "EXPIRED"].includes(ticket.status)) {
      return res.status(409).json({
        success: false,
        message: ticket.status === "CANCELLED" ? "Vé đã bị hủy" : "Vé đã hết hạn",
      });
    }

    if (ticket.bookingId?.payment_status !== "paid" || ticket.bookingId?.status !== "confirmed") {
      return res.status(409).json({
        success: false,
        message: "Đơn vé chưa hoàn tất thanh toán",
      });
    }

    const qrPayload = buildTicketQrPayload(decryptQrToken(ticket.qrTokenEncrypted));

    return res.json({
      success: true,
      message: "Lấy dữ liệu QR vé thành công",
      data: {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        qrPayload,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Không thể lấy dữ liệu QR vé" : error.message,
    });
  }
};

export const getMyTicketsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "ID đơn vé không hợp lệ" });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user_id: req.user.id,
    }).select("_id status payment_status");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    if (booking.status !== "confirmed" || booking.payment_status !== "paid") {
      return res.status(409).json({
        success: false,
        message: "Đơn vé chưa được xác nhận thanh toán thành công",
      });
    }

    await createTicketsForPaidBooking(booking._id);
    const tickets = await populateTicketQuery(
      Ticket.find({ bookingId: booking._id, userId: req.user.id })
        .select("-qrTokenHash -qrTokenEncrypted")
        .sort({ seatLabel: 1 }),
    );
    await expireEndedTickets(tickets);

    return res.json({
      success: true,
      message: "Lấy vé theo đơn thành công",
      data: tickets.map(formatTicketForOwner),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Không thể lấy vé theo đơn" : error.message,
    });
  }
};
