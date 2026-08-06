import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import TicketScanLog, {
  TICKET_SCAN_ACTIONS,
  TICKET_SCAN_RESULTS,
  createTicketScanLogSafe,
} from "../models/TicketScanLog.js";
import { ticketCheckInConfig } from "../config/ticketConfig.js";
import { hashQrToken } from "../services/ticketService.js";

const QR_PAYLOAD_PREFIX = "AURA_TICKET:";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const normalizeQrToken = (value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  return rawValue.startsWith(QR_PAYLOAD_PREFIX)
    ? rawValue.slice(QR_PAYLOAD_PREFIX.length).trim()
    : rawValue;
};

const getRequestIp = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || "";
};

const getScanMeta = (req) => ({
  adminId: req.user?.id || null,
  ipAddress: getRequestIp(req),
  userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
});

const writeScanLog = (req, { ticketId = null, action, result, errorNote = "" }) =>
  createTicketScanLogSafe({
    ticketId,
    action,
    result,
    errorNote,
    ...getScanMeta(req),
  });

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const parseDateRange = (query = {}) => {
  const startValue = query.dateFrom || query.from || query.startDate;
  const endValue = query.dateTo || query.to || query.endDate || startValue;
  const range = {};

  if (startValue) {
    const start = new Date(startValue);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
  }

  if (endValue) {
    const end = new Date(endValue);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
  }

  return Object.keys(range).length ? range : null;
};

const objectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const buildScanLogAggregation = (query = {}) => {
  const match = {};
  const scannedAtRange = parseDateRange(query);

  if (scannedAtRange) match.scannedAt = scannedAtRange;
  if (TICKET_SCAN_ACTIONS.includes(String(query.action || "").trim())) {
    match.action = String(query.action).trim();
  }

  if (TICKET_SCAN_RESULTS.includes(String(query.result || "").trim())) {
    match.result = String(query.result).trim();
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: { path: "$ticket", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "movies",
        localField: "ticket.movieId",
        foreignField: "_id",
        as: "movie",
      },
    },
    { $unwind: { path: "$movie", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "showtimes",
        localField: "ticket.showtimeId",
        foreignField: "_id",
        as: "showtime",
      },
    },
    { $unwind: { path: "$showtime", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "rooms",
        localField: "ticket.roomId",
        foreignField: "_id",
        as: "room",
      },
    },
    { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "adminId",
        foreignField: "_id",
        as: "admin",
      },
    },
    { $unwind: { path: "$admin", preserveNullAndEmptyArrays: true } },
  ];

  const linkedMatch = {};
  const movieId = objectIdOrNull(query.movieId);
  const showtimeId = objectIdOrNull(query.showtimeId);
  const roomId = objectIdOrNull(query.roomId);

  if (movieId) linkedMatch["ticket.movieId"] = movieId;
  if (showtimeId) linkedMatch["ticket.showtimeId"] = showtimeId;
  if (roomId) linkedMatch["ticket.roomId"] = roomId;

  if (query.movie) {
    linkedMatch["movie.title"] = new RegExp(escapeRegex(query.movie), "i");
  }

  if (query.room) {
    linkedMatch["room.name"] = new RegExp(escapeRegex(query.room), "i");
  }

  if (query.q || query.search) {
    const regex = new RegExp(escapeRegex(query.q || query.search), "i");
    linkedMatch.$or = [
      { "ticket.ticketCode": regex },
      { "ticket.seatLabel": regex },
    ];
  }

  if (Object.keys(linkedMatch).length) {
    pipeline.push({ $match: linkedMatch });
  }

  return pipeline;
};

const formatScanLogRow = (log) => ({
  id: log._id,
  scannedAt: log.scannedAt,
  ticketCode: log.ticket?.ticketCode || "",
  ticketStatus: log.ticket?.status || "",
  movie: log.movie?._id
    ? {
      id: log.movie._id,
      title: log.movie.title,
    }
    : null,
  showtime: log.showtime?._id
    ? {
      id: log.showtime._id,
      startTime: log.showtime.start_time,
      endTime: log.showtime.end_time,
    }
    : null,
  room: log.room?._id
    ? {
      id: log.room._id,
      name: log.room.name,
    }
    : null,
  seatLabel: log.ticket?.seatLabel || "",
  admin: log.admin?._id
    ? {
      id: log.admin._id,
      name: log.admin.full_name || "",
      email: log.admin.email || "",
    }
    : null,
  action: log.action,
  result: log.result,
  errorNote: log.errorNote || "",
});

const getScanStats = async ({ query = {}, totalFiltered = 0 }) => {
  const showtimeId = objectIdOrNull(query.showtimeId);
  const [errorResult, successScanResult] = await Promise.all([
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { result: { $ne: "SUCCESS" } } },
      { $count: "count" },
    ]),
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { result: "SUCCESS" } },
      { $count: "count" },
    ]),
  ]);

  if (!showtimeId) {
    return {
      totalTicketsOfShowtime: null,
      validTickets: null,
      checkedInTickets: null,
      notCheckedInTickets: null,
      cancelledTickets: null,
      expiredTickets: null,
      errorScans: errorResult[0]?.count || 0,
      successScans: successScanResult[0]?.count || 0,
      totalScans: totalFiltered,
    };
  }

  const [totalTicketsOfShowtime, validTickets, checkedInTickets, cancelledTickets, expiredTickets] = await Promise.all([
    Ticket.countDocuments({ showtimeId }),
    Ticket.countDocuments({ showtimeId, status: "VALID" }),
    Ticket.countDocuments({ showtimeId, status: "CHECKED_IN" }),
    Ticket.countDocuments({ showtimeId, status: "CANCELLED" }),
    Ticket.countDocuments({ showtimeId, status: "EXPIRED" }),
  ]);

  return {
    totalTicketsOfShowtime,
    validTickets,
    checkedInTickets,
    notCheckedInTickets: validTickets,
    cancelledTickets,
    expiredTickets,
    errorScans: errorResult[0]?.count || 0,
    successScans: successScanResult[0]?.count || 0,
    checkInRate: totalTicketsOfShowtime > 0 ? Math.round((checkedInTickets / totalTicketsOfShowtime) * 100) : 0,
    totalScans: totalFiltered,
  };
};

const populateTicketForAdmin = (query) =>
  query
    .select("-qrTokenHash -qrTokenEncrypted")
    .populate("bookingId", "booking_code status payment_status paid_at total_price customer_name customer_email customer_phone")
    .populate("movieId", "title poster duration age_limit")
    .populate("showtimeId", "start_time end_time status")
    .populate("roomId", "name")
    .populate({
      path: "seatId",
      select: "seat_row seat_number seat_code seat_type_id",
      populate: { path: "seat_type_id", select: "name" },
    })
    .populate("checkedInBy", "full_name email");

const formatTicketForAdmin = (ticket, verification = {}) => {
  const booking = ticket.bookingId || {};
  const movie = ticket.movieId || {};
  const showtime = ticket.showtimeId || {};
  const room = ticket.roomId || {};
  const seat = ticket.seatId || {};

  return {
    id: ticket._id,
    ticketCode: ticket.ticketCode,
    status: ticket.status,
    seatLabel: ticket.seatLabel,
    price: ticket.price,
    checkedInAt: ticket.checkedInAt,
    checkedInBy: ticket.checkedInBy || null,
    booking: booking?._id
      ? {
        id: booking._id,
        bookingCode: booking.booking_code,
        status: booking.status,
        paymentStatus: booking.payment_status,
        paidAt: booking.paid_at,
        totalPrice: booking.total_price,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
      }
      : null,
    movie: movie?._id
      ? {
        id: movie._id,
        title: movie.title,
        poster: movie.poster,
        duration: movie.duration,
        ageLimit: movie.age_limit,
      }
      : null,
    showtime: showtime?._id
      ? {
        id: showtime._id,
        startTime: showtime.start_time,
        endTime: showtime.end_time,
        status: showtime.status,
      }
      : null,
    room: room?._id
      ? {
        id: room._id,
        name: room.name,
      }
      : null,
    seat: {
      id: seat?._id || ticket.seatId,
      label: ticket.seatLabel,
      row: seat?.seat_row || "",
      number: seat?.seat_number || null,
      code: seat?.seat_code || ticket.seatLabel,
      type: seat?.seat_type_id?.name || "",
    },
    verification,
  };
};

const getTicketByQrToken = async (qrToken) => {
  const token = normalizeQrToken(qrToken);
  if (!token) return null;

  return populateTicketForAdmin(
    Ticket.findOne({
      qrTokenHash: hashQrToken(token),
    }),
  );
};

const getCheckInWindow = (showtime) => {
  const startTime = showtime?.start_time ? new Date(showtime.start_time) : null;
  if (!startTime || Number.isNaN(startTime.getTime())) return null;

  return {
    opensAt: new Date(startTime.getTime() - ticketCheckInConfig.beforeMinutes * 60 * 1000),
    closesAt: new Date(startTime.getTime() + ticketCheckInConfig.afterMinutes * 60 * 1000),
  };
};

const evaluateTicketBase = (ticket) => {
  if (!ticket) {
    return {
      allowed: false,
      result: "INVALID_TOKEN",
      statusCode: 404,
      message: "Mã QR không hợp lệ.",
    };
  }

  const booking = ticket.bookingId;
  if (!booking || booking.payment_status !== "paid" || booking.status !== "confirmed") {
    return {
      allowed: false,
      result: "PAYMENT_NOT_COMPLETED",
      statusCode: 409,
      message: "Đơn hàng chưa được thanh toán.",
    };
  }

  if (ticket.status === "CANCELLED") {
    return {
      allowed: false,
      result: "CANCELLED",
      statusCode: 409,
      message: "Vé đã bị hủy.",
    };
  }

  if (ticket.status === "EXPIRED") {
    return {
      allowed: false,
      result: "EXPIRED",
      statusCode: 409,
      message: "Vé đã hết hạn.",
    };
  }

  return null;
};

const evaluateTicketForCheckIn = (ticket, now = new Date()) => {
  const baseEvaluation = evaluateTicketBase(ticket);
  if (baseEvaluation) return baseEvaluation;

  if (ticket.status === "CHECKED_IN") {
    return {
      allowed: false,
      result: "ALREADY_CHECKED_IN",
      statusCode: 409,
      message: `Vé này đã được check-in lúc ${new Date(ticket.checkedInAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
    };
  }

  const checkInWindow = getCheckInWindow(ticket.showtimeId);
  if (!checkInWindow) {
    return {
      allowed: false,
      result: "WRONG_SHOWTIME",
      statusCode: 409,
      message: "Suất chiếu của vé không hợp lệ.",
    };
  }

  if (now < checkInWindow.opensAt) {
    return {
      allowed: false,
      result: "WRONG_SHOWTIME",
      statusCode: 409,
      message: "Chưa đến thời gian check-in.",
      checkInWindow,
    };
  }

  if (now > checkInWindow.closesAt) {
    return {
      allowed: false,
      result: "EXPIRED",
      statusCode: 409,
      message: "Vé đã hết hạn.",
      checkInWindow,
    };
  }

  return {
    allowed: true,
    result: "SUCCESS",
    statusCode: 200,
    message: "Vé hợp lệ, có thể check-in.",
    checkInWindow,
  };
};

export const verifyAdminTicketQr = async (req, res) => {
  const qrToken = normalizeQrToken(req.body?.qrToken);

  if (!qrToken) {
    await writeScanLog(req, {
      action: "VERIFY",
      result: "INVALID_TOKEN",
      errorNote: "Thieu qrToken",
    });

    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã QR.",
    });
  }

  try {
    const ticket = await getTicketByQrToken(qrToken);
    const evaluation = evaluateTicketForCheckIn(ticket);

    await writeScanLog(req, {
      ticketId: ticket?._id || null,
      action: "VERIFY",
      result: evaluation.result,
      errorNote: evaluation.allowed ? "" : evaluation.message,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: evaluation.message,
      });
    }

    return res.status(evaluation.allowed ? 200 : evaluation.statusCode).json({
      success: evaluation.allowed,
      message: evaluation.message,
      data: formatTicketForAdmin(ticket, {
        canCheckIn: evaluation.allowed,
        result: evaluation.result,
        checkInWindow: evaluation.checkInWindow || getCheckInWindow(ticket.showtimeId),
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xác minh mã QR.",
    });
  }
};

export const getAdminTicketScanLogs = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const basePipeline = buildScanLogAggregation(req.query);

    const [items, totalResult] = await Promise.all([
      TicketScanLog.aggregate([
        ...basePipeline,
        { $sort: { scannedAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            qrTokenHash: 0,
            qrTokenEncrypted: 0,
            "ticket.qrTokenHash": 0,
            "ticket.qrTokenEncrypted": 0,
          },
        },
      ]),
      TicketScanLog.aggregate([
        ...basePipeline,
        { $count: "totalItems" },
      ]),
    ]);

    const totalItems = totalResult[0]?.totalItems || 0;
    const stats = await getScanStats({ query: req.query, totalFiltered: totalItems });

    return res.json({
      success: true,
      message: "Lấy lịch sử quét vé thành công",
      data: items.map(formatScanLogRow),
      stats,
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
      message: "Không thể lấy lịch sử quét vé.",
    });
  }
};

export const checkInAdminTicketQr = async (req, res) => {
  const qrToken = normalizeQrToken(req.body?.qrToken);

  if (!qrToken) {
    await writeScanLog(req, {
      action: "CHECK_IN",
      result: "INVALID_TOKEN",
      errorNote: "Thieu qrToken",
    });

    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã QR.",
    });
  }

  try {
    const ticket = await getTicketByQrToken(qrToken);
    const now = new Date();
    const evaluation = evaluateTicketForCheckIn(ticket, now);

    if (!evaluation.allowed) {
      await writeScanLog(req, {
        ticketId: ticket?._id || null,
        action: "CHECK_IN",
        result: evaluation.result,
        errorNote: evaluation.message,
      });

      return res.status(evaluation.statusCode).json({
        success: false,
        message: evaluation.message,
        data: ticket
          ? formatTicketForAdmin(ticket, {
            canCheckIn: false,
            result: evaluation.result,
            checkInWindow: evaluation.checkInWindow || getCheckInWindow(ticket.showtimeId),
          })
          : null,
      });
    }

    const updatedTicket = await Ticket.findOneAndUpdate(
      {
        _id: ticket._id,
        status: "VALID",
      },
      {
        $set: {
          status: "CHECKED_IN",
          checkedInAt: now,
          checkedInBy: req.user.id,
        },
      },
      {
        new: true,
      },
    );

    if (!updatedTicket) {
      const latestTicket = await getTicketByQrToken(qrToken);
      const latestEvaluation = evaluateTicketForCheckIn(latestTicket, now);

      await writeScanLog(req, {
        ticketId: latestTicket?._id || ticket._id,
        action: "CHECK_IN",
        result: latestEvaluation.result,
        errorNote: latestEvaluation.message,
      });

      return res.status(latestEvaluation.statusCode).json({
        success: false,
        message: latestEvaluation.message,
        data: latestTicket
          ? formatTicketForAdmin(latestTicket, {
            canCheckIn: false,
            result: latestEvaluation.result,
            checkInWindow: latestEvaluation.checkInWindow || getCheckInWindow(latestTicket.showtimeId),
          })
          : null,
      });
    }

    const populatedTicket = await populateTicketForAdmin(Ticket.findById(updatedTicket._id));

    await writeScanLog(req, {
      ticketId: updatedTicket._id,
      action: "CHECK_IN",
      result: "SUCCESS",
    });

    return res.json({
      success: true,
      message: "Check-in vé thành công.",
      data: formatTicketForAdmin(populatedTicket, {
        canCheckIn: false,
        result: "SUCCESS",
        checkInWindow: evaluation.checkInWindow,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể check-in vé.",
    });
  }
};
