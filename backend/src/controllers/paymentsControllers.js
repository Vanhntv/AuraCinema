import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import Payment from "../models/Payment.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import { markBookingAsPaid } from "./bookingsControllers.js";
import {
  buildVnpayPaymentUrl,
  getClientIp,
  verifyVnpayReturnParams,
} from "../services/vnpayPaymentService.js";
import {
  buildSepayPgCheckoutFields,
  fetchSepayPgOrder,
} from "../services/sepayPgPaymentService.js";
import {
  assertBookingPayable,
  expirePendingBooking,
  isBookingPaymentExpired,
  markLatePaymentForReview,
} from "../services/bookingExpiryService.js";
import { refundVoucherUsageForBooking } from "../services/voucherService.js";

const normalizeMoney = (value) => Math.round(Number(value || 0));

const getSepayOrderData = (response = {}) => response.data || response.order || response.result || response;

const getSepayOrderStatus = (order = {}) => String(
  order.order_status ||
  order.payment_status ||
  order.status ||
  order.transaction_status ||
  "",
).trim().toUpperCase();

const getSepayOrderAmount = (order = {}) => normalizeMoney(
  order.order_amount ||
  order.amount ||
  order.total_amount ||
  order.paid_amount ||
  0,
);

const SEPAY_PG_SUCCESS_STATUSES = new Set(["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED", "CAPTURED", "APPROVED"]);
const SEPAY_PG_FAILED_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "VOIDED", "EXPIRED", "ERROR"]);
const SEPAY_PG_RETURN_FAILURE_RESULTS = new Set(["cancel", "cancelled", "canceled", "error", "failed", "failure"]);

const restoreComboStock = async ({ combos = [], session }) => {
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
        { session },
      ),
    ),
  );
};

const cancelUnpaidBookingAfterPaymentFailure = async ({
  booking,
  provider,
  transactionId = "",
  reason = "Thanh toán thất bại hoặc bị hủy",
  session,
}) => {
  if (booking.status !== "pending" || booking.payment_status !== "pending") {
    return booking;
  }

  booking.status = "cancelled";
  booking.cancelled_by = "customer";
  booking.cancellation_reason = reason;
  booking.cancelled_at = new Date();
  booking.payment_status = "cancelled";
  booking.payment_provider = provider;
  booking.payment_transaction_id = transactionId;
  await booking.save({ session });

  await ShowtimeSeat.updateMany(
    {
      _id: { $in: booking.showtime_seat_ids },
      status: "reserved",
      held_by: booking.user_id,
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
    { session },
  );
  await restoreComboStock({ combos: booking.combos, session });
  if (booking.voucher?.voucher_id) {
    await refundVoucherUsageForBooking({
      bookingId: booking._id,
      refundUsage: true,
      finalStatus: "cancelled",
      session,
    });
  }

  return booking;
};

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
    if (isTransactionUnsupportedError(error)) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("MongoDB production cần replica set hoặc sharded cluster để xử lý thanh toán an toàn"),
          { statusCode: 503 },
        );
      }

      return work(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

export const createVnpayPaymentUrl = async (req, res) => {
  try {
    const bookingId = String(req.body?.booking_id || "").trim();
    const requestedAmount = normalizeMoney(req.body?.amount);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "booking_id không hợp lệ" });
    }

    const booking = await Booking.findOne({ _id: bookingId, user_id: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    if (booking.payment_status === "paid") {
      return res.status(409).json({ success: false, message: "Đơn vé đã thanh toán" });
    }
    const expiryResult = await expirePendingBooking({ booking });
    if (expiryResult.expired) {
      return res.status(410).json({ success: false, message: "Đơn vé đã hết thời gian thanh toán" });
    }
    assertBookingPayable(booking);

    const bookingAmount = normalizeMoney(booking.total_price);
    if (requestedAmount !== bookingAmount) {
      return res.status(400).json({ success: false, message: "Số tiền thanh toán không khớp đơn vé" });
    }

    const { paymentUrl, vnpParams, secureHash } = buildVnpayPaymentUrl({
      bookingId,
      amount: bookingAmount,
      ipAddr: getClientIp(req),
      frontendUrl: req.body?.frontend_url || req.get("origin") || process.env.FRONTEND_URL,
    });

    const payment = await Payment.findOneAndUpdate(
      { booking_id: booking._id, provider: "vnpay", status: "pending" },
      {
        $set: {
          amount: bookingAmount,
          payment_code: booking.booking_code,
          transaction_ref: bookingId,
          payment_url: paymentUrl,
          order_info: vnpParams.vnp_OrderInfo,
          raw_request_data: { ...vnpParams, vnp_SecureHash: secureHash },
        },
        $setOnInsert: {
          booking_id: booking._id,
          provider: "vnpay",
          status: "pending",
        },
      },
      { new: true, upsert: true },
    );

    return res.json({
      success: true,
      data: {
        paymentUrl,
        payment_id: payment._id,
        booking_id: booking._id,
      },
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Không thể tạo URL thanh toán VNPay" });
  }
};

export const createSepayPgCheckout = async (req, res) => {
  try {
    const bookingId = String(req.body?.booking_id || "").trim();
    const requestedAmount = normalizeMoney(req.body?.amount);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "booking_id không hợp lệ" });
    }

    const booking = await Booking.findOne({ _id: bookingId, user_id: req.user.id }).populate("user_id", "full_name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn vé" });
    }

    if (booking.payment_status === "paid") {
      return res.status(409).json({ success: false, message: "Đơn vé đã thanh toán" });
    }
    const expiryResult = await expirePendingBooking({ booking });
    if (expiryResult.expired) {
      return res.status(410).json({ success: false, message: "Đơn vé đã hết thời gian thanh toán" });
    }
    assertBookingPayable(booking);

    const bookingAmount = normalizeMoney(booking.total_price);
    if (requestedAmount !== bookingAmount) {
      return res.status(400).json({ success: false, message: "Số tiền thanh toán không khớp đơn vé" });
    }

    const { checkoutUrl, fields } = buildSepayPgCheckoutFields({
      booking,
      amount: bookingAmount,
      frontendUrl: req.body?.frontend_url || req.get("origin") || process.env.FRONTEND_URL,
      customerName: booking.user_id?.full_name,
    });

    const payment = await Payment.findOneAndUpdate(
      { booking_id: booking._id, provider: "sepay_pg", status: "pending" },
      {
        $set: {
          amount: bookingAmount,
          payment_code: booking.booking_code,
          transaction_ref: booking.booking_code,
          payment_url: checkoutUrl,
          order_info: fields.order_description,
          raw_request_data: fields,
        },
        $setOnInsert: {
          booking_id: booking._id,
          provider: "sepay_pg",
          status: "pending",
        },
      },
      { new: true, upsert: true },
    );

    return res.json({
      success: true,
      data: {
        checkoutUrl,
        fields,
        payment_id: payment._id,
        booking_id: booking._id,
      },
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Không thể tạo thanh toán SePay" });
  }
};

export const verifyVnpayReturn = async (req, res) => {
  try {
    const verification = verifyVnpayReturnParams(req.query);
    const params = verification.params;
    const bookingId = String(params.vnp_TxnRef || "").trim();
    const responseCode = String(params.vnp_ResponseCode || "").trim();
    const transactionStatus = String(params.vnp_TransactionStatus || "").trim();
    const vnpAmount = normalizeMoney(Number(params.vnp_Amount || 0) / 100);
    const success = responseCode === "00" && transactionStatus === "00";

    if (!verification.isValid) {
      return res.status(400).json({
        success: false,
        message: "Sai chữ ký VNPay",
        code: "97",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Mã đơn VNPay không hợp lệ", code: "01" });
    }

    const result = await runWithOptionalTransaction(async (session) => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw Object.assign(new Error("Không tìm thấy đơn vé"), { statusCode: 404, code: "01" });
      }

      if (normalizeMoney(booking.total_price) !== vnpAmount) {
        throw Object.assign(new Error("Số tiền VNPay trả về không khớp đơn vé"), { statusCode: 400, code: "04" });
      }

      const payment = await Payment.findOneAndUpdate(
        { booking_id: booking._id, provider: "vnpay" },
        {
          $set: {
            amount: vnpAmount,
            payment_code: booking.booking_code,
            transaction_ref: bookingId,
            transaction_id: String(params.vnp_TransactionNo || ""),
            bank_code: String(params.vnp_BankCode || ""),
            response_code: responseCode,
            transaction_status: transactionStatus,
            order_info: String(params.vnp_OrderInfo || ""),
            raw_return_data: req.query,
          },
          $setOnInsert: {
            booking_id: booking._id,
            provider: "vnpay",
          },
        },
        { new: true, upsert: true, session, sort: { created_at: -1 } },
      );

      if (success && (booking.payment_status === "expired" || isBookingPaymentExpired(booking))) {
        const expiryResult = await expirePendingBooking({ booking, session });
        const expiredBooking = expiryResult.booking || booking;
        return markLatePaymentForReview({
          booking: expiredBooking,
          payment,
          provider: "vnpay",
          transactionId: String(params.vnp_TransactionNo || params.vnp_BankTranNo || bookingId),
          session,
        });
      }

      if (success) {
        const paidBooking = await markBookingAsPaid({
          booking,
          provider: "vnpay",
          transactionId: String(params.vnp_TransactionNo || params.vnp_BankTranNo || bookingId),
          session,
        });

        if (payment.status !== "paid") {
          payment.status = "paid";
          payment.paid_at = paidBooking.paid_at || new Date();
          await payment.save({ session });
        }

        return { booking: paidBooking, payment };
      }

      payment.status = "failed";
      await payment.save({ session });

      const cancelledBooking = await cancelUnpaidBookingAfterPaymentFailure({
        booking,
        provider: "vnpay",
        transactionId: String(params.vnp_TransactionNo || params.vnp_BankTranNo || ""),
        reason: "Khách hủy hoặc thanh toán VNPay thất bại",
        session,
      });

      return { booking: cancelledBooking, payment };
    });

    const requiresRefundReview = Boolean(result.lateSuccess);
    return res.status(requiresRefundReview ? 409 : 200).json({
      success: success && !requiresRefundReview,
      message: requiresRefundReview
        ? "Đã nhận thanh toán sau khi đơn hết hạn; giao dịch đang chờ đối soát và hoàn tiền"
        : success ? "Thanh toán VNPay thành công" : "Thanh toán VNPay thất bại",
      data: {
        booking_id: result.booking._id,
        booking_status: result.booking.status,
        payment_status: result.booking.payment_status,
        payment_id: result.payment._id,
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: transactionStatus,
        requires_refund_review: requiresRefundReview,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Không thể xác minh kết quả VNPay",
      code: error.code || "99",
    });
  }
};

export const verifySepayPgReturn = async (req, res) => {
  try {
    const bookingId = String(req.query.booking_id || "").trim();
    const invoiceNumber = String(req.query.invoice || req.query.order_invoice_number || "").trim().toUpperCase();
    const returnResult = String(req.query.sepay_result || req.query.result || "").trim().toLowerCase();
    const isExplicitFailureReturn = SEPAY_PG_RETURN_FAILURE_RESULTS.has(returnResult);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "booking_id không hợp lệ" });
    }

    if (!invoiceNumber) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn SePay" });
    }

    const orderResponse = isExplicitFailureReturn ? { query: req.query } : await fetchSepayPgOrder(invoiceNumber);
    const order = isExplicitFailureReturn ? {} : getSepayOrderData(orderResponse);
    const orderStatus = isExplicitFailureReturn ? returnResult.toUpperCase() : getSepayOrderStatus(order);
    const sepayAmount = isExplicitFailureReturn ? 0 : getSepayOrderAmount(order);
    const success = SEPAY_PG_SUCCESS_STATUSES.has(orderStatus);

    const result = await runWithOptionalTransaction(async (session) => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw Object.assign(new Error("Không tìm thấy đơn vé"), { statusCode: 404 });
      }

      if (booking.booking_code !== invoiceNumber) {
        throw Object.assign(new Error("Mã đơn SePay không khớp booking"), { statusCode: 400 });
      }

      const bookingAmount = normalizeMoney(booking.total_price);
      if (sepayAmount > 0 && bookingAmount !== sepayAmount) {
        throw Object.assign(new Error("Số tiền SePay trả về không khớp đơn vé"), { statusCode: 400 });
      }

      const payment = await Payment.findOneAndUpdate(
        { booking_id: booking._id, provider: "sepay_pg" },
        {
          $set: {
            amount: sepayAmount || bookingAmount,
            payment_code: booking.booking_code,
            transaction_ref: invoiceNumber,
            transaction_id: String(order.transaction_id || order.payment_id || order.id || invoiceNumber),
            response_code: orderStatus,
            transaction_status: orderStatus,
            order_info: String(order.order_description || order.description || ""),
            raw_return_data: orderResponse,
          },
          $setOnInsert: {
            booking_id: booking._id,
            provider: "sepay_pg",
          },
        },
        { new: true, upsert: true, session, sort: { created_at: -1 } },
      );

      if (success && (booking.payment_status === "expired" || isBookingPaymentExpired(booking))) {
        const expiryResult = await expirePendingBooking({ booking, session });
        const expiredBooking = expiryResult.booking || booking;
        return markLatePaymentForReview({
          booking: expiredBooking,
          payment,
          provider: "sepay_pg",
          transactionId: String(order.transaction_id || order.payment_id || order.id || invoiceNumber),
          session,
        });
      }

      if (success) {
        const paidBooking = await markBookingAsPaid({
          booking,
          provider: "sepay_pg",
          transactionId: String(order.transaction_id || order.payment_id || order.id || invoiceNumber),
          session,
        });

        if (payment.status !== "paid") {
          payment.status = "paid";
          payment.paid_at = paidBooking.paid_at || new Date();
          await payment.save({ session });
        }

        return { booking: paidBooking, payment };
      }

      if (isExplicitFailureReturn || SEPAY_PG_FAILED_STATUSES.has(orderStatus)) {
        payment.status = "failed";
        await payment.save({ session });

        const cancelledBooking = await cancelUnpaidBookingAfterPaymentFailure({
          booking,
          provider: "sepay_pg",
          transactionId: String(order.transaction_id || order.payment_id || order.id || ""),
          reason: isExplicitFailureReturn ? "Khách hủy thanh toán SePay" : "Thanh toán SePay thất bại hoặc bị hủy",
          session,
        });

        return { booking: cancelledBooking, payment };
      }

      return { booking, payment };
    });

    const requiresRefundReview = Boolean(result.lateSuccess);
    return res.status(requiresRefundReview ? 409 : 200).json({
      success: success && !requiresRefundReview,
      message: requiresRefundReview
        ? "Đã nhận thanh toán sau khi đơn hết hạn; giao dịch đang chờ đối soát và hoàn tiền"
        : success ? "Thanh toán SePay thành công" : isExplicitFailureReturn ? "Thanh toán SePay đã bị hủy" : "Thanh toán SePay chưa hoàn tất",
      data: {
        booking_id: result.booking._id,
        booking_status: result.booking.status,
        payment_status: result.booking.payment_status,
        payment_id: result.payment._id,
        sepay_status: orderStatus,
        requires_refund_review: requiresRefundReview,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Không thể xác minh kết quả SePay",
    });
  }
};
