import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import {
  cancelValidTicketsForBooking,
  createTicketsForPaidBooking,
} from "../services/ticketService.js";
import {
  refundVoucherUsageForBooking,
} from "../services/voucherService.js";
import {
  creditRewardPointsForBooking,
  reverseRewardPointsForBooking,
} from "../services/rewardPointService.js";
import { expirePendingBooking } from "../services/bookingExpiryService.js";

const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"];
const EDITABLE_PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"];
const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"];

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePaymentStatusForBooking = (booking, paymentStatus) => {
  const updates = { payment_status: paymentStatus };

  if (paymentStatus === "paid") {
    updates.status = "confirmed";
    updates.paid_at = booking.paid_at || new Date();
  }

  if (paymentStatus === "pending") {
    updates.status = booking.status === "cancelled" ? "cancelled" : "pending";
  }

  if (paymentStatus === "failed") {
    updates.status = booking.status === "cancelled" ? "cancelled" : "pending";
  }

  if (paymentStatus === "cancelled") {
    updates.status = "cancelled";
    updates.cancelled_by = booking.cancelled_by || "cinema";
    updates.cancelled_at = booking.cancelled_at || new Date();
  }

  if (paymentStatus === "refunded") {
    updates.status = "cancelled";
    updates.cancelled_by = booking.cancelled_by || "cinema";
    updates.cancelled_at = booking.cancelled_at || new Date();
  }

  return updates;
};

const buildBookingQuery = (query = {}) => {
  const filter = {};
  const search = String(query.q || query.search || "").trim();

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { booking_code: regex },
      { customer_name: regex },
      { customer_email: regex },
      { customer_phone: regex },
    ];

    if (mongoose.Types.ObjectId.isValid(search)) {
      filter.$or.push({ _id: search });
    }
  }

  if (PAYMENT_STATUSES.includes(query.payment_status)) {
    filter.payment_status = query.payment_status;
  }

  if (BOOKING_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  if (query.user_id && mongoose.Types.ObjectId.isValid(query.user_id)) {
    filter.user_id = query.user_id;
  }

  return filter;
};

const populateBooking = (query) =>
  query
    .populate("user_id", "full_name email phone")
    .populate({
      path: "showtime_id",
      select: "movie_id room_id start_time end_time",
      populate: [
        { path: "movie_id", select: "title poster duration age_limit" },
        {
          path: "room_id",
          select: "name cinema_id",
          populate: { path: "cinema_id", select: "name address city" },
        },
      ],
    })
    .populate({
      path: "showtime_seat_ids",
      populate: {
        path: "seat_id",
        select: "seat_row seat_number seat_type_id",
        populate: { path: "seat_type_id", select: "name" },
      },
    })
    .populate({ path: "combos.combo_id", select: "name image type" })
    .populate({ path: "voucher.voucher_id", select: "code name apply_scope" });

const restoreComboStock = async ({ combos = [] }) => {
  const restorableCombos = combos
    .map((item) => ({
      combo_id: item.combo_id,
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => item.combo_id && item.quantity > 0);

  if (!restorableCombos.length) return;

  await Promise.all(
    restorableCombos.map((item) =>
      Combo.updateOne(
        { _id: item.combo_id },
        { $inc: { stock: item.quantity } },
      ),
    ),
  );
};

const releaseBookingSeats = async (booking) => {
  await ShowtimeSeat.updateMany(
    {
      _id: { $in: booking.showtime_seat_ids },
      status: { $in: ["reserved", "booked"] },
      reserved_by_booking_id: booking._id,
    },
    {
      $set: {
        status: "available",
        held_by: null,
        reserved_by_booking_id: null,
        hold_expires_at: null,
      },
    },
  );
};

const markBookingSeatsAsBooked = async (booking) => {
  await ShowtimeSeat.updateMany(
    {
      _id: { $in: booking.showtime_seat_ids },
      status: "reserved",
      reserved_by_booking_id: booking._id,
    },
    { $set: { status: "booked", held_by: null, hold_expires_at: null } },
  );

  const bookedCount = await ShowtimeSeat.countDocuments({
    _id: { $in: booking.showtime_seat_ids },
    status: "booked",
    reserved_by_booking_id: booking._id,
  });

  if (bookedCount !== booking.showtime_seat_ids.length) {
    const error = new Error("Ghế trong đơn không còn ở trạng thái chờ thanh toán");
    error.statusCode = 409;
    throw error;
  }
};

export const getAdminBookings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildBookingQuery(req.query);

    const [bookings, totalItems] = await Promise.all([
      populateBooking(Booking.find(filter))
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getAdminBookingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đơn vé không hợp lệ" });
    }

    const booking = await populateBooking(Booking.findById(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateAdminBookingPayment = async (req, res) => {
  try {
    const paymentStatus = String(req.body.payment_status || "").trim();
    if (!EDITABLE_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Trạng thái thanh toán không hợp lệ" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đơn vé không hợp lệ" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    if (paymentStatus === "paid") {
      const expiryResult = await expirePendingBooking({ booking });
      if (expiryResult.expired || booking.payment_status === "expired") {
        return res.status(410).json({
          success: false,
          message: "Đơn vé đã hết thời gian thanh toán; không thể xác nhận thủ công",
        });
      }
    }

    const wasCancelled = booking.status === "cancelled";
    const previousPaymentStatus = booking.payment_status;

    if (previousPaymentStatus === "paid" && !["paid", "cancelled", "refunded"].includes(paymentStatus)) {
      return res.status(409).json({
        success: false,
        message: "Không thể đưa đơn đã thanh toán về trạng thái chưa thanh toán",
      });
    }

    if (booking.status === "cancelled" && !["cancelled", "refunded"].includes(paymentStatus)) {
      return res.status(409).json({ success: false, message: "Không thể đổi đơn đã hủy về trạng thái đang bán" });
    }

    if (paymentStatus === "paid" && previousPaymentStatus !== "paid") {
      await markBookingSeatsAsBooked(booking);
    }

    const updates = normalizePaymentStatusForBooking(booking, paymentStatus);
    updates.payment_provider = String(req.body.payment_provider || booking.payment_provider || "manual").trim();
    updates.payment_transaction_id = String(
      req.body.payment_transaction_id || req.body.transaction_id || booking.payment_transaction_id || "",
    ).trim();

    Object.assign(booking, updates);
    if (paymentStatus === "paid" && previousPaymentStatus !== "paid") {
      await creditRewardPointsForBooking({ booking });
    }
    if (paymentStatus === "refunded" && previousPaymentStatus !== "refunded") {
      await reverseRewardPointsForBooking({ booking });
    }
    await booking.save();

    if (booking.status === "confirmed" && booking.payment_status === "paid") {
      await createTicketsForPaidBooking(booking._id);
    }

    if (["cancelled", "refunded"].includes(paymentStatus) && !wasCancelled) {
      await releaseBookingSeats(booking);
      await restoreComboStock({ combos: booking.combos });
      await cancelValidTicketsForBooking(booking._id);
      if (paymentStatus === "refunded" || previousPaymentStatus !== "paid") {
        await refundVoucherUsageForBooking({
          bookingId: booking._id,
          refundUsage: true,
          finalStatus: paymentStatus === "refunded" ? "refunded" : "cancelled",
        });
      }
    }

    const populatedBooking = await populateBooking(Booking.findById(booking._id));
    return res.json({ success: true, message: "Đã cập nhật thanh toán", data: populatedBooking });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const cancelAdminBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đơn vé không hợp lệ" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    if (booking.status === "cancelled") {
      return res.status(409).json({ success: false, message: "Đơn vé đã được hủy trước đó" });
    }

    const refundPayment = req.body?.refund_payment === true;
    const wasPaid = booking.payment_status === "paid";
    booking.status = "cancelled";
    booking.cancelled_by = "cinema";
    booking.cancellation_reason = String(req.body?.reason || "").trim();
    booking.cancelled_at = new Date();
    booking.payment_status = refundPayment ? "refunded" : (wasPaid ? "paid" : "cancelled");
    if (refundPayment) {
      await reverseRewardPointsForBooking({ booking });
    }
    await booking.save();

    await releaseBookingSeats(booking);
    await restoreComboStock({ combos: booking.combos });
    await cancelValidTicketsForBooking(booking._id);
    if (!wasPaid || refundPayment) {
      await refundVoucherUsageForBooking({
        bookingId: booking._id,
        refundUsage: true,
        finalStatus: refundPayment ? "refunded" : "cancelled",
      });
    }

    const populatedBooking = await populateBooking(Booking.findById(booking._id));
    return res.json({
      success: true,
      message: refundPayment ? "Đã hủy đơn và ghi nhận hoàn tiền" : "Đã hủy đơn vé",
      data: populatedBooking,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
