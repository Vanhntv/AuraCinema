import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import Payment from "../models/Payment.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import { PAYMENT_DURATION_MS, createPaymentExpiry, isExpired } from "./seatHoldPolicy.js";
import { refundVoucherUsageForBooking } from "./voucherService.js";

const makeError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("only servers in a sharded cluster can start a new transaction") ||
    message.includes("replica set member or mongos")
  );
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

export const resolvePaymentExpiry = (booking) => {
  if (booking?.payment_expires_at) return new Date(booking.payment_expires_at);
  if (booking?.created_at) return createPaymentExpiry(new Date(booking.created_at));
  return null;
};

export const isBookingPaymentExpired = (booking, now = new Date()) => {
  if (!booking || booking.payment_status === "paid") return false;
  return isExpired(resolvePaymentExpiry(booking), now);
};

export const assertBookingPayable = (booking, now = new Date()) => {
  if (isBookingPaymentExpired(booking, now) || booking?.payment_status === "expired") {
    throw makeError("Đơn vé đã hết thời gian thanh toán", 410);
  }
  if (booking?.status !== "pending" || booking?.payment_status !== "pending") {
    throw makeError("Đơn vé không còn ở trạng thái chờ thanh toán", 409);
  }
};

export const expirePendingBooking = async ({
  booking,
  bookingId,
  now = new Date(),
  session = null,
}) => {
  const targetId = booking?._id || bookingId;
  if (!targetId) return { expired: false, booking: null };

  const deadline = resolvePaymentExpiry(booking);
  if (!deadline) return { expired: false, booking };
  if (deadline && !isExpired(deadline, now)) {
    return { expired: false, booking };
  }

  const expiryFilter = booking?.payment_expires_at
    ? { payment_expires_at: { $lte: now } }
    : booking?.created_at
      ? { created_at: { $lte: new Date(now.getTime() - PAYMENT_DURATION_MS) } }
      : {};

  const expiredBooking = await Booking.findOneAndUpdate(
    {
      _id: targetId,
      status: "pending",
      payment_status: "pending",
      ...expiryFilter,
    },
    {
      $set: {
        status: "cancelled",
        payment_status: "expired",
        cancelled_by: "system",
        cancellation_reason: "Hết thời gian thanh toán",
        cancelled_at: now,
      },
    },
    { returnDocument: "after", session },
  );

  if (!expiredBooking) return { expired: false, booking };

  await ShowtimeSeat.updateMany(
    {
      _id: { $in: expiredBooking.showtime_seat_ids || [] },
      status: "reserved",
      reserved_by_booking_id: expiredBooking._id,
    },
    {
      $set: {
        status: "available",
        held_by: null,
        hold_id: null,
        reserved_by_booking_id: null,
        hold_expires_at: null,
      },
    },
    { session },
  );

  for (const item of expiredBooking.combos || []) {
    const quantity = Number(item.quantity || 0);
    if (!item.combo_id || quantity <= 0) continue;
    await Combo.updateOne(
      { _id: item.combo_id },
      { $inc: { stock: quantity } },
      { session },
    );
  }

  if (expiredBooking.voucher?.voucher_id) {
    await refundVoucherUsageForBooking({
      bookingId: expiredBooking._id,
      refundUsage: true,
      finalStatus: "cancelled",
      session,
    });
  }

  await Payment.updateMany(
    { booking_id: expiredBooking._id, status: "pending" },
    { $set: { status: "expired" } },
    { session },
  );
  await Booking.updateOne(
    { _id: expiredBooking._id, resources_released_at: null },
    { $set: { resources_released_at: now } },
    { session },
  );

  expiredBooking.resources_released_at = now;
  return { expired: true, booking: expiredBooking };
};

export const expirePendingBookings = async ({ now = new Date(), limit = 100 } = {}) => {
  const legacyCutoff = new Date(now.getTime() - PAYMENT_DURATION_MS);
  const bookings = await Booking.find({
    status: "pending",
    payment_status: "pending",
    $or: [
      { payment_expires_at: { $lte: now } },
      {
        payment_expires_at: null,
        created_at: { $lte: legacyCutoff },
      },
    ],
  }).limit(limit);

  let count = 0;
  for (const booking of bookings) {
    const result = await runWithOptionalTransaction(async (session) => {
      const currentBooking = session
        ? await Booking.findById(booking._id).session(session)
        : booking;
      return expirePendingBooking({ booking: currentBooking, now, session });
    });
    if (result.expired) count += 1;
  }
  return count;
};

export const markLatePaymentForReview = async ({
  booking,
  payment,
  provider,
  transactionId = "",
  now = new Date(),
  session = null,
}) => {
  booking.status = "cancelled";
  booking.payment_status = "refund_pending";
  booking.payment_provider = provider;
  booking.payment_transaction_id = transactionId;
  await booking.save({ session });

  payment.status = "review_required";
  payment.transaction_id = transactionId;
  payment.paid_at = now;
  await payment.save({ session });

  return { booking, payment, lateSuccess: true };
};
