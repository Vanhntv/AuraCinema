import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingActionLog, { createBookingActionLogSafe } from "../models/BookingActionLog.js";
import Ticket from "../models/Ticket.js";
import {
  buildTicketQrPayload,
  decryptQrToken,
  hashQrToken,
} from "../services/ticketService.js";
import {
  parseBookingQrPayload,
} from "../services/bookingOrderService.js";
import {
  formatBookingOrder,
  populateBookingOrderTickets,
} from "../services/bookingViewService.js";

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("transaction numbers are only allowed")
    || message.includes("only servers in a sharded cluster can start a new transaction")
    || message.includes("replica set member or mongos");
};

const runWithOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupportedError(error) && process.env.NODE_ENV !== "production") {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const getRequestMeta = (req) => ({
  adminId: req.user?.id || null,
  ipAddress: String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim(),
  userAgent: String(req.headers?.["user-agent"] || "").slice(0, 512),
});

const getSkipReason = (ticket) => {
  if (ticket.status === "CHECKED_IN") return "CHECKED_IN";
  if (ticket.status === "CANCELLED") return "CANCELLED";
  if (ticket.status === "EXPIRED") return "EXPIRED";
  if (ticket.printedAt) return "ALREADY_PRINTED";
  return "NOT_ELIGIBLE";
};

export const isBookingShowtimeEnded = (booking, now = new Date()) => {
  const endTime = new Date(booking?.showtime_snapshot?.end_time || "");
  return !Number.isNaN(endTime.getTime()) && now.getTime() >= endTime.getTime();
};

export const getInitialPrintEligibility = (tickets = []) => {
  const sortedTickets = [...tickets].sort((first, second) =>
    String(first.seatLabel || "").localeCompare(String(second.seatLabel || "")));
  return {
    eligible: sortedTickets.filter((ticket) => ticket.status === "VALID" && !ticket.printedAt),
    skipped: sortedTickets
      .filter((ticket) => ticket.status !== "VALID" || ticket.printedAt)
      .map((ticket) => ({
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        seatLabel: ticket.seatLabel,
        reason: getSkipReason(ticket),
      })),
  };
};

export const validateReprintRequest = ({ bookingId, ticketIds, reason }) => {
  const normalizedReason = String(reason || "").trim();
  const normalizedTicketIds = Array.isArray(ticketIds)
    ? [...new Set(ticketIds.map((value) => String(value).trim()).filter(Boolean))]
    : [];
  if (!String(bookingId || "").trim() || !normalizedTicketIds.length) {
    throw Object.assign(new Error("Vui lòng chọn ít nhất một vé để in lại"), { statusCode: 400 });
  }
  if (normalizedReason.length < 3) {
    throw Object.assign(new Error("Lý do in lại phải có ít nhất 3 ký tự"), { statusCode: 400 });
  }
  return { bookingId: String(bookingId), ticketIds: normalizedTicketIds, reason: normalizedReason };
};

const toPlain = (value) => typeof value?.toObject === "function" ? value.toObject() : { ...value };

export const buildBookingPrintPayload = ({ booking, tickets, qrPayloadByTicketId, skippedTickets = [] }) => {
  const source = toPlain(booking);
  return {
    booking: {
      id: source._id,
      bookingCode: source.booking_code,
      customer: {
        name: source.customer_name,
        email: source.customer_email,
        phone: source.customer_phone,
      },
      movie: source.movie_snapshot || {},
      showtime: source.showtime_snapshot || {},
      seats: source.seat_items || [],
      services: source.combos || [],
      voucher: source.voucher || null,
      pricing: source.pricing || {
        subtotal: source.subtotal_price,
        discount: source.discount_amount,
        total: source.total_price,
      },
      payment: {
        provider: source.payment_provider,
        transactionId: source.payment_transaction_id,
        paidAt: source.paid_at,
      },
    },
    tickets: tickets.map((ticketValue) => {
      const ticket = toPlain(ticketValue);
      return {
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        seatLabel: ticket.seatLabel,
        seatType: ticket.seatType || "",
        price: Number(ticket.price || 0),
        status: ticket.status,
        qrPayload: qrPayloadByTicketId.get(String(ticket._id)) || "",
      };
    }),
    skippedTickets,
  };
};

const assertPrintableBooking = (booking) => {
  if (!booking) {
    throw Object.assign(new Error("Không tìm thấy đơn vé từ QR"), { statusCode: 404, code: "INVALID_TOKEN" });
  }
  if (Number(booking.ticketing_version) !== 2) {
    throw Object.assign(new Error("Đơn vé cũ không hỗ trợ QR đơn"), { statusCode: 409, code: "LEGACY_BOOKING_UNSUPPORTED" });
  }
  if (booking.status !== "confirmed" || booking.payment_status !== "paid") {
    throw Object.assign(new Error("Đơn vé chưa thanh toán hoặc đã bị hủy"), { statusCode: 409, code: "BOOKING_NOT_PAYABLE" });
  }
  if (isBookingShowtimeEnded(booking)) {
    throw Object.assign(new Error("Suất chiếu của đơn vé đã kết thúc"), {
      statusCode: 409,
      code: "SHOWTIME_ENDED",
    });
  }
};

const createQrPayloadMap = (tickets) => new Map(tickets.map((ticket) => [
  String(ticket._id),
  buildTicketQrPayload(decryptQrToken(ticket.qrTokenEncrypted)),
]));

export const scanPrintBookingOrder = async (req, res) => {
  const token = parseBookingQrPayload(req.body?.qrToken);
  if (!token) {
    await createBookingActionLogSafe({
      action: "LOOKUP",
      result: "INVALID_TOKEN",
      ...getRequestMeta(req),
    });
    return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "QR đơn vé không hợp lệ" });
  }

  try {
    const result = await runWithOptionalTransaction(async (session) => {
      const booking = await Booking.findOne({
        ticketing_version: 2,
        "order_qr.token_hash": hashQrToken(token),
      }).session(session);
      assertPrintableBooking(booking);

      const allTickets = await Ticket.find({ bookingId: booking._id })
        .select("+qrTokenEncrypted +printClaimId")
        .sort({ seatLabel: 1 })
        .session(session);
      const expectedCount = booking.seat_items?.length || booking.showtime_seat_ids?.length || 0;
      if (!expectedCount || allTickets.length !== expectedCount) {
        throw Object.assign(new Error("Vé trong đơn chưa được phát hành đầy đủ"), {
          statusCode: 409,
          code: "TICKETS_NOT_READY",
        });
      }

      const { eligible, skipped } = getInitialPrintEligibility(allTickets);
      if (!eligible.length) {
        return { booking, claimedTickets: [], skippedTickets: skipped };
      }

      const claimId = crypto.randomUUID();
      const now = new Date();
      await Ticket.updateMany(
        {
          _id: { $in: eligible.map((ticket) => ticket._id) },
          bookingId: booking._id,
          status: "VALID",
          printedAt: null,
        },
        { $set: { printedAt: now, printedBy: req.user.id, printClaimId: claimId } },
        { session },
      );

      const claimedTickets = await Ticket.find({ bookingId: booking._id, printClaimId: claimId })
        .select("+qrTokenEncrypted +printClaimId")
        .sort({ seatLabel: 1 })
        .session(session);
      const claimedIds = new Set(claimedTickets.map((ticket) => String(ticket._id)));
      const concurrentSkips = eligible
        .filter((ticket) => !claimedIds.has(String(ticket._id)))
        .map((ticket) => ({
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          seatLabel: ticket.seatLabel,
          reason: "ALREADY_PRINTED",
        }));

      return {
        booking,
        claimedTickets,
        skippedTickets: [...skipped, ...concurrentSkips],
      };
    });

    if (!result.claimedTickets.length) {
      await createBookingActionLogSafe({
        bookingId: result.booking._id,
        action: "PRINT_INITIAL",
        result: "NO_ELIGIBLE_TICKETS",
        metadata: { skippedTickets: result.skippedTickets },
        ...getRequestMeta(req),
      });
      return res.status(409).json({
        success: false,
        code: "NO_ELIGIBLE_TICKETS",
        message: "Không còn vé hợp lệ chưa in trong đơn",
        data: { skippedTickets: result.skippedTickets },
      });
    }

    const printPayload = buildBookingPrintPayload({
      booking: result.booking,
      tickets: result.claimedTickets,
      qrPayloadByTicketId: createQrPayloadMap(result.claimedTickets),
      skippedTickets: result.skippedTickets,
    });
    await createBookingActionLogSafe({
      bookingId: result.booking._id,
      ticketIds: result.claimedTickets.map((ticket) => ticket._id),
      action: "PRINT_INITIAL",
      result: result.skippedTickets.length ? "PARTIAL" : "SUCCESS",
      metadata: { skippedTickets: result.skippedTickets },
      ...getRequestMeta(req),
    });

    return res.json({ success: true, message: "Đã chuẩn bị in các vé trong đơn", data: printPayload });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "ERROR",
      message: error.statusCode ? error.message : "Không thể xử lý QR đơn vé",
    });
  }
};

export const lookupAdminBookingOrderPrint = async (req, res) => {
  try {
    const qrToken = String(req.body?.qrToken || "").trim();
    const bookingCode = String(req.body?.bookingCode || "").trim().toUpperCase();
    let booking;

    if (qrToken) {
      const token = parseBookingQrPayload(qrToken);
      if (!token) {
        await createBookingActionLogSafe({
          action: "LOOKUP",
          result: "INVALID_TOKEN",
          ...getRequestMeta(req),
        });
        return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "QR đơn vé không hợp lệ" });
      }
      booking = await Booking.findOne({
        ticketing_version: 2,
        "order_qr.token_hash": hashQrToken(token),
      });
    } else if (bookingCode) {
      booking = await Booking.findOne({ booking_code: bookingCode });
    } else {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp mã đơn hoặc QR đơn vé" });
    }

    assertPrintableBooking(booking);

    const allTickets = await Ticket.find({ bookingId: booking._id })
      .select("+qrTokenEncrypted")
      .sort({ seatLabel: 1 });
    const expectedCount = booking.seat_items?.length || booking.showtime_seat_ids?.length || 0;
    if (!expectedCount || allTickets.length !== expectedCount) {
      throw Object.assign(new Error("Vé trong đơn chưa được phát hành đầy đủ"), {
        statusCode: 409,
        code: "TICKETS_NOT_READY",
      });
    }

    const { eligible, skipped } = getInitialPrintEligibility(allTickets);
    const printPayload = buildBookingPrintPayload({
      booking,
      tickets: eligible,
      qrPayloadByTicketId: createQrPayloadMap(eligible),
      skippedTickets: skipped,
    });

    await createBookingActionLogSafe({
      bookingId: booking._id,
      action: "LOOKUP",
      result: "SUCCESS",
      metadata: {
        source: qrToken ? "ORDER_QR" : "BOOKING_CODE",
        eligibleTicketCount: eligible.length,
        skippedTicketCount: skipped.length,
      },
      ...getRequestMeta(req),
    });

    return res.json({
      success: true,
      message: eligible.length
        ? "Đã tải đơn vé. Bấm In đơn vé để in các vé hợp lệ chưa in."
        : "Đơn vé không còn vé hợp lệ chưa in.",
      data: printPayload,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "ERROR",
      message: error.statusCode ? error.message : "Không thể tra cứu đơn vé để in",
      data: error?.data || null,
    });
  }
};

export const lookupAdminBookingOrder = async (req, res) => {
  try {
    const bookingCode = String(req.body?.bookingCode || "").trim().toUpperCase();
    if (!bookingCode) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập mã đơn" });
    }
    const booking = await Booking.findOne({ booking_code: bookingCode });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }
    const tickets = await populateBookingOrderTickets(
      Ticket.find({ bookingId: booking._id }).sort({ seatLabel: 1 }),
    );
    const actions = await BookingActionLog.find({ bookingId: booking._id })
      .sort({ createdAt: -1 })
      .limit(50);
    await createBookingActionLogSafe({
      bookingId: booking._id,
      action: "LOOKUP",
      result: "SUCCESS",
      ...getRequestMeta(req),
    });
    return res.json({
      success: true,
      data: { ...formatBookingOrder(booking, tickets), action_logs: actions },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể tra cứu đơn vé" });
  }
};

export const reprintBookingTickets = async (req, res) => {
  try {
    const input = validateReprintRequest({
      bookingId: req.params.id,
      ticketIds: req.body?.ticketIds,
      reason: req.body?.reason,
    });
    if (!mongoose.Types.ObjectId.isValid(input.bookingId)
      || input.ticketIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: "ID đơn hoặc vé không hợp lệ" });
    }

    const booking = await Booking.findById(input.bookingId);
    assertPrintableBooking(booking);
    const tickets = await Ticket.find({
      _id: { $in: input.ticketIds },
      bookingId: booking._id,
      status: "VALID",
    }).select("+qrTokenEncrypted").sort({ seatLabel: 1 });
    if (tickets.length !== input.ticketIds.length) {
      return res.status(409).json({
        success: false,
        code: "TICKETS_NOT_REPRINTABLE",
        message: "Một hoặc nhiều vé không thuộc đơn hoặc không còn hợp lệ",
      });
    }

    const printPayload = buildBookingPrintPayload({
      booking,
      tickets,
      qrPayloadByTicketId: createQrPayloadMap(tickets),
    });
    await createBookingActionLogSafe({
      bookingId: booking._id,
      ticketIds: tickets.map((ticket) => ticket._id),
      action: "REPRINT",
      result: "SUCCESS",
      reason: input.reason,
      ...getRequestMeta(req),
    });
    return res.json({ success: true, message: "Đã chuẩn bị in lại vé", data: printPayload });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "ERROR",
      message: error.statusCode ? error.message : "Không thể in lại vé",
    });
  }
};
