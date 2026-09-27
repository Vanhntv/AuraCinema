import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { createBookingActionLogSafe } from "../models/BookingActionLog.js";
import Ticket from "../models/Ticket.js";
import { scanHistoryGrouping } from "../modules/tickets/scanHistoryGrouping.js";
import { BOOKING_SCAN_ACTIONS, bookingScanHistoryUnion } from "../modules/tickets/bookingScanHistory.js";
import { BOOKING_ACTION_RESULTS } from "../models/BookingActionLog.js";
import TicketScanLog, {
  TICKET_SCAN_ACTIONS,
  TICKET_SCAN_RESULTS,
  createTicketScanLogSafe,
} from "../models/TicketScanLog.js";
import {
  buildTicketQrPayload,
  decryptQrToken,
  hashQrToken,
  parseTicketQrPayload,
} from "../services/ticketService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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
  if ([...TICKET_SCAN_ACTIONS, ...BOOKING_SCAN_ACTIONS].includes(String(query.action || "").trim())) {
    match.action = String(query.action).trim();
  }

  if ([...TICKET_SCAN_RESULTS, ...BOOKING_ACTION_RESULTS].includes(String(query.result || "").trim())) {
    match.result = String(query.result).trim();
  }

  const pipeline = [
    { $set: { source: "ticket" } },
    bookingScanHistoryUnion(),
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
    { $set: { bookingJoinId: { $ifNull: ["$bookingId", "$ticket.bookingId"] } } },
    { $lookup: { from: "bookings", localField: "bookingJoinId", foreignField: "_id", as: "booking" } },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },
    { $set: {
      linkedMovieId: { $ifNull: ["$ticket.movieId", "$booking.movie_snapshot.movie_id"] },
      linkedShowtimeId: { $ifNull: ["$ticket.showtimeId", "$booking.showtime_id"] },
      linkedRoomId: { $ifNull: ["$ticket.roomId", "$booking.showtime_snapshot.room_id"] },
    } },
    {
      $lookup: {
        from: "movies",
        localField: "linkedMovieId",
        foreignField: "_id",
        as: "movie",
      },
    },
    { $unwind: { path: "$movie", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "showtimes",
        localField: "linkedShowtimeId",
        foreignField: "_id",
        as: "showtime",
      },
    },
    { $unwind: { path: "$showtime", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "rooms",
        localField: "linkedRoomId",
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

  if (movieId) linkedMatch.linkedMovieId = movieId;
  if (showtimeId) linkedMatch.linkedShowtimeId = showtimeId;
  if (roomId) linkedMatch.linkedRoomId = roomId;

  if (query.movie) {
    linkedMatch["movie.title"] = new RegExp(escapeRegex(query.movie), "i");
  }

  if (query.room) {
    linkedMatch["room.name"] = new RegExp(escapeRegex(query.room), "i");
  }

  if (query.q || query.search) {
    const regex = new RegExp(escapeRegex(query.q || query.search), "i");
    linkedMatch.$or = [
      { "booking.booking_code": regex },
      { "ticket.seatLabel": regex },
      { "booking.seat_items.seat_label": regex },
    ];
  }

  if (Object.keys(linkedMatch).length) {
    pipeline.push({ $match: linkedMatch });
  }

  return pipeline;
};

const getOrderSeatLabels = (log) => {
  const snapshotSeats = (log.booking?.seat_items || []).map((seat) => seat.seat_label).filter(Boolean);
  const ticketSeats = (log.bookingTickets || []).map((ticket) => ticket.seatLabel).filter(Boolean);
  const seats = snapshotSeats.length ? snapshotSeats : ticketSeats.length ? ticketSeats : log.scannedSeats?.filter(Boolean) || [log.ticket?.seatLabel].filter(Boolean);
  return [...new Set(seats)].sort((first, second) => first.localeCompare(second, "vi", { numeric: true }));
};

const formatScanLogRow = (log) => ({
  id: `${log.source || "ticket"}-${log._id}`,
  bookingId: log.booking?._id || log.ticket?.bookingId || null,
  bookingCode: log.booking?.booking_code || "",
  historyCount: log.scanCount || 1,
  ticketCount: getOrderSeatLabels(log).length,
  scanCount: log.source === "booking" ? log.ticketIds?.length || log.booking?.seat_items?.length || 0 : log.scanCount || 1,
  scannedAt: log.scannedAt,
  ticketCode: log.ticket?.ticketCode || "",
  ticketStatus: log.ticket?.status || "",
  movie: log.movie?._id
    ? {
      id: log.movie._id,
      title: log.movie.title,
    }
    : log.booking?.movie_snapshot?.title ? { id: log.booking.movie_snapshot.movie_id, title: log.booking.movie_snapshot.title } : null,
  showtime: log.showtime?._id
    ? {
      id: log.showtime._id,
      startTime: log.showtime.start_time,
      endTime: log.showtime.end_time,
    }
    : log.booking?.showtime_snapshot?.start_time ? { id: log.booking.showtime_id, startTime: log.booking.showtime_snapshot.start_time, endTime: log.booking.showtime_snapshot.end_time } : null,
  room: log.room?._id
    ? {
      id: log.room._id,
      name: log.room.name,
    }
    : log.booking?.showtime_snapshot?.room_name ? { id: log.booking.showtime_snapshot.room_id, name: log.booking.showtime_snapshot.room_name } : null,
  seatLabel: getOrderSeatLabels(log).join(", "),
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
  ipAddress: log.ipAddress || "",
  userAgent: log.userAgent || "",
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const getScanStats = async ({ query = {} }) => {
  const showtimeId = objectIdOrNull(query.showtimeId);
  const [errorResult, successScanResult, verifyScanResult, successfulCheckInResult] = await Promise.all([
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { result: { $nin: ["SUCCESS", "PARTIAL"] } } },
      { $count: "count" },
    ]),
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { result: { $in: ["SUCCESS", "PARTIAL"] } } },
      { $count: "count" },
    ]),
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { action: { $in: ["VERIFY", "LOOKUP"] } } },
      { $count: "count" },
    ]),
    TicketScanLog.aggregate([
      ...buildScanLogAggregation(query),
      { $match: { action: "CHECK_IN", result: "SUCCESS" } },
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
      verifyScans: verifyScanResult[0]?.count || 0,
      successfulCheckIns: successfulCheckInResult[0]?.count || 0,
      totalScans: (errorResult[0]?.count || 0) + (successScanResult[0]?.count || 0),
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
    verifyScans: verifyScanResult[0]?.count || 0,
    successfulCheckIns: successfulCheckInResult[0]?.count || 0,
    checkInRate: totalTicketsOfShowtime > 0 ? Math.round((checkedInTickets / totalTicketsOfShowtime) * 100) : 0,
    totalScans: (errorResult[0]?.count || 0) + (successScanResult[0]?.count || 0),
  };
};

const populateTicketForAdmin = (query, { includeQrToken = false } = {}) => {
  const selectedQuery = query.select(
    includeQrToken ? "+qrTokenEncrypted -qrTokenHash" : "-qrTokenHash -qrTokenEncrypted",
  );

  return selectedQuery
    .populate("bookingId", "booking_code status payment_status paid_at total_price customer_name customer_email customer_phone combos")
    .populate("movieId", "title poster duration age_limit")
    .populate("showtimeId", "start_time end_time status")
    .populate({
      path: "roomId",
      select: "name cinema_id",
      populate: { path: "cinema_id", select: "name address" },
    })
    .populate({
      path: "seatId",
      select: "seat_row seat_number seat_code seat_type_id",
      populate: { path: "seat_type_id", select: "name" },
    })
    .populate("checkedInBy", "full_name email")
    .populate("printedBy", "full_name email");
};

export const formatTicketForAdmin = (ticket, verification = {}) => {
  const booking = ticket.bookingId || {};
  const movie = ticket.movieId || {};
  const showtime = ticket.showtimeId || {};
  const room = ticket.roomId || {};
  const cinema = room.cinema_id || {};
  const seat = ticket.seatId || {};

  return {
    id: ticket._id,
    ticketCode: ticket.ticketCode,
    status: ticket.status,
    seatLabel: ticket.seatLabel,
    price: ticket.price,
    checkedInAt: ticket.checkedInAt,
    checkedInBy: ticket.checkedInBy || null,
    printedAt: ticket.printedAt || null,
    printedBy: ticket.printedBy || null,
    printPendingAt: ticket.printPendingAt || null,
    canPrint: !ticket.printedAt && !ticket.printPendingAt,
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
        combos: Array.isArray(booking.combos)
          ? booking.combos.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          }))
          : [],
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
      row: seat?.seat_row || "",
      number: seat?.seat_number || null,
      code: seat?.seat_code || ticket.seatLabel,
      type: seat?.seat_type_id?.name || "",
    },
    verification,
  };
};

const getTicketByQrToken = async (token) => {
  return populateTicketForAdmin(
    Ticket.findOne({
      qrTokenHash: hashQrToken(token),
    }).select("+printClaimId"),
  );
};

const normalizeTicketCode = (value) => String(value || "").trim().toUpperCase();

const getTicketByCode = async (ticketCode) =>
  populateTicketForAdmin(
    Ticket.findOne({ ticketCode: normalizeTicketCode(ticketCode) }),
    { includeQrToken: true },
  );

export const claimTicketPrintOnce = ({ qrToken, adminId, now = new Date(), claimId = randomUUID() }) =>
  Ticket.findOneAndUpdate(
    {
      qrTokenHash: hashQrToken(qrToken),
      status: "VALID",
      printedAt: null,
      printPendingAt: null,
    },
    {
      $set: {
        printPendingAt: now,
        printPendingBy: adminId,
        printClaimId: claimId,
      },
    },
    { new: true },
  ).select("+printClaimId");

const getCheckInWindow = (showtime, movie) => {
  const startTime = showtime?.start_time ? new Date(showtime.start_time) : null;
  if (!startTime || Number.isNaN(startTime.getTime())) return null;

  const configuredEndTime = showtime?.end_time ? new Date(showtime.end_time) : null;
  const durationMinutes = Number(movie?.duration || 0);
  const calculatedEndTime = durationMinutes > 0
    ? new Date(startTime.getTime() + durationMinutes * 60 * 1000)
    : null;
  const closesAt = configuredEndTime && !Number.isNaN(configuredEndTime.getTime())
    ? configuredEndTime
    : calculatedEndTime;

  if (!closesAt || Number.isNaN(closesAt.getTime())) return null;

  return {
    opensAt: null,
    closesAt,
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
  if (ticket.status === "CANCELLED" || booking?.status === "cancelled") {
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

  if (!booking || booking.payment_status !== "paid" || booking.status !== "confirmed") {
    return {
      allowed: false,
      result: "PAYMENT_NOT_COMPLETED",
      statusCode: 409,
      message: "Đơn hàng chưa được thanh toán.",
    };
  }

  return null;
};

export const evaluateTicketForCheckIn = (ticket, now = new Date()) => {
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

  const checkInWindow = getCheckInWindow(ticket.showtimeId, ticket.movieId);
  if (!checkInWindow) {
    return {
      allowed: false,
      result: "WRONG_SHOWTIME",
      statusCode: 409,
      message: "Suất chiếu của vé không hợp lệ.",
    };
  }

  if (now > checkInWindow.closesAt) {
    return {
      allowed: false,
      result: "EXPIRED",
      statusCode: 409,
      message: "Suất chiếu đã kết thúc, không thể check-in vé.",
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
  const qrToken = parseTicketQrPayload(req.body?.qrToken);

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
    const evaluation = evaluateTicketForCheckIn(ticket, new Date());

    if (ticket && evaluation.result === "EXPIRED" && ticket.status === "VALID") {
      await Ticket.updateOne({ _id: ticket._id, status: "VALID" }, { $set: { status: "EXPIRED" } });
      ticket.status = "EXPIRED";
    }

    await writeScanLog(req, {
      ticketId: ticket?._id || null,
      action: "VERIFY",
      result: evaluation.result,
      errorNote: evaluation.allowed ? "" : evaluation.message,
    });

    if (!evaluation.allowed) {
      return res.status(evaluation.statusCode).json({
        success: false,
        message: evaluation.message,
        data: ticket
          ? formatTicketForAdmin(ticket, {
            canCheckIn: false,
            result: evaluation.result,
            checkInWindow: evaluation.checkInWindow || getCheckInWindow(ticket.showtimeId, ticket.movieId),
          })
          : null,
      });
    }

    return res.json({
      success: true,
      message: "Đã tải thông tin vé thành công.",
      data: formatTicketForAdmin(ticket, {
        canCheckIn: true,
        result: "SUCCESS",
        checkInWindow: evaluation.checkInWindow,
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
    const historyPipeline = req.query.groupBy === "booking" ? [...basePipeline, ...scanHistoryGrouping()] : basePipeline;

    const [items, totalResult] = await Promise.all([
      TicketScanLog.aggregate([
        ...historyPipeline,
        { $sort: { scannedAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: "tickets", localField: "booking._id", foreignField: "bookingId", as: "bookingTickets", pipeline: [{ $project: { seatLabel: 1 } }] } },
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
        ...historyPipeline,
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

export const printAdminTicketQr = async (req, res) => {
  const qrToken = parseTicketQrPayload(req.body?.qrToken);

  if (!qrToken) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã QR.",
    });
  }

  try {
    let claimedTicket = await claimTicketPrintOnce({
      qrToken,
      adminId: req.user.id,
    });

    if (!claimedTicket) {
      const existingTicket = await getTicketByQrToken(qrToken);
      if (!existingTicket) {
        return res.status(404).json({
          success: false,
          message: "Mã QR không hợp lệ.",
        });
      }

      if (existingTicket.printPendingAt && String(existingTicket.printPendingBy) === String(req.user.id)) {
        claimedTicket = existingTicket;
      } else if (existingTicket.printPendingAt) {
        return res.status(409).json({ success: false, message: "Vé đang chờ nhân viên khác xác nhận kết quả in.", data: formatTicketForAdmin(existingTicket) });
      } else {
        const printedTime = existingTicket.printedAt
        ? new Date(existingTicket.printedAt).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        : "trước đó";

        return res.status(409).json({
          success: false,
          message: `Vé này đã được in lúc ${printedTime} và không thể in lại.`,
          data: formatTicketForAdmin(existingTicket),
        });
      }
    }

    const populatedTicket = await populateTicketForAdmin(Ticket.findById(claimedTicket._id));
    return res.json({
      success: true,
      message: "Đã chuẩn bị vé. Hãy xác nhận kết quả sau khi đóng hộp thoại in.",
      printClaimId: claimedTicket.printClaimId,
      data: formatTicketForAdmin(populatedTicket),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể ghi nhận lượt in vé.",
    });
  }
};

export const confirmAdminTicketPrint = async (req, res) => {
  const qrToken = parseTicketQrPayload(req.body?.qrToken);
  const claimId = String(req.body?.printClaimId || "").trim();
  const success = req.body?.success;
  const reason = String(req.body?.reason || "").trim();
  if (!qrToken || !claimId || typeof success !== "boolean" || (!success && reason.length < 3)) {
    return res.status(400).json({ success: false, message: "Vui lòng xác nhận kết quả in và nhập lý do nếu in lỗi." });
  }
  try {
    const now = new Date();
    const ticket = await Ticket.findOneAndUpdate(
      { qrTokenHash: hashQrToken(qrToken), printClaimId: claimId, printPendingBy: req.user.id, printPendingAt: { $ne: null }, printedAt: null },
      success
        ? { $set: { printedAt: now, printedBy: req.user.id, printPendingAt: null, printPendingBy: null } }
        : { $set: { printPendingAt: null, printPendingBy: null, printClaimId: "" } },
      { new: true },
    );
    if (!ticket) return res.status(409).json({ success: false, message: "Lượt in không còn chờ xác nhận. Hãy quét lại vé." });
    await createBookingActionLogSafe({
      bookingId: ticket.bookingId, ticketIds: [ticket._id], adminId: req.user.id,
      action: "PRINT_INITIAL", result: success ? "SUCCESS" : "ERROR", reason: success ? "" : reason,
      metadata: { printClaimId: claimId, confirmedAt: now },
    });
    const populatedTicket = await populateTicketForAdmin(Ticket.findById(ticket._id));
    return res.json({ success: true, message: success ? "Đã xác nhận in thành công. Vé không thể in tiếp." : "Đã ghi nhận in lỗi. Có thể in lại vé.", data: formatTicketForAdmin(populatedTicket) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể xác nhận kết quả in vé." });
  }
};

export const lookupAdminTicketCode = async (req, res) => {
  const ticketCode = normalizeTicketCode(req.body?.ticketCode);

  if (!/^[A-Z0-9-]{6,64}$/.test(ticketCode)) {
    return res.status(400).json({
      success: false,
      message: "Mã vé không hợp lệ. Vui lòng kiểm tra và nhập lại.",
    });
  }

  try {
    const ticket = await getTicketByCode(ticketCode);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vé với mã đã nhập.",
      });
    }

    const evaluation = evaluateTicketForCheckIn(ticket, new Date());
    if (evaluation.result === "EXPIRED" && ticket.status === "VALID") {
      await Ticket.updateOne({ _id: ticket._id, status: "VALID" }, { $set: { status: "EXPIRED" } });
      ticket.status = "EXPIRED";
    }

    const qrPayload = buildTicketQrPayload(decryptQrToken(ticket.qrTokenEncrypted));
    await writeScanLog(req, {
      ticketId: ticket._id,
      action: "VERIFY",
      result: evaluation.result,
      errorNote: evaluation.allowed ? "" : evaluation.message,
    });

    const responseBody = {
      success: evaluation.allowed,
      message: evaluation.allowed ? "Đã tìm thấy vé." : evaluation.message,
      data: formatTicketForAdmin(ticket, {
        canCheckIn: evaluation.allowed,
        result: evaluation.result,
        checkInWindow: evaluation.checkInWindow || getCheckInWindow(ticket.showtimeId, ticket.movieId),
      }),
      qrPayload,
    };

    return evaluation.allowed
      ? res.json(responseBody)
      : res.status(evaluation.statusCode).json(responseBody);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể tra cứu mã vé.",
    });
  }
};

export const checkInAdminTicketQr = async (req, res) => {
  const qrToken = parseTicketQrPayload(req.body?.qrToken);

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
      if (ticket && evaluation.result === "EXPIRED" && ticket.status === "VALID") {
        await Ticket.updateOne({ _id: ticket._id, status: "VALID" }, { $set: { status: "EXPIRED" } });
        ticket.status = "EXPIRED";
      }
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
            checkInWindow: evaluation.checkInWindow || getCheckInWindow(ticket.showtimeId, ticket.movieId),
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
            checkInWindow: latestEvaluation.checkInWindow || getCheckInWindow(latestTicket.showtimeId, latestTicket.movieId),
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
