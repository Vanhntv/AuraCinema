import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import { decryptQrToken } from "../services/ticketService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const resolvePosterUrl = (poster) => poster || null;

const formatTicket = (ticket) => {
  const movie = ticket.movieId || {};
  const showtime = ticket.showtimeId || {};
  const room = ticket.roomId || {};
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
      }
      : null,
    movie: movie?._id
      ? {
        id: movie._id,
        title: movie.title,
        poster: resolvePosterUrl(movie.poster),
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
    seat: {
      id: ticket.seatId?._id || ticket.seatId,
      label: ticket.seatLabel,
    },
    price: ticket.price,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    checkedOutAt: ticket.checkedOutAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
};

const populateTicketQuery = (query) =>
  query
    .populate("bookingId", "booking_code status payment_status paid_at")
    .populate("movieId", "title poster")
    .populate("showtimeId", "start_time end_time")
    .populate("roomId", "name")
    .populate("seatId", "seat_row seat_number seat_code");

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

    return res.json({
      success: true,
      message: "Lấy danh sách vé thành công",
      data: tickets.map(formatTicket),
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

    return res.json({
      success: true,
      message: "Lấy thông tin vé thành công",
      data: formatTicket(ticket),
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

    const qrToken = decryptQrToken(ticket.qrTokenEncrypted);
    const qrPayload = `AURA_TICKET:${qrToken}`;

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
