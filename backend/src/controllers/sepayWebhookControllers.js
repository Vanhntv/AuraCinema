import SepayTransaction from "../models/SepayTransaction.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { markBookingAsPaid } from "./bookingsControllers.js";
import {
  expirePendingBooking,
  isBookingPaymentExpired,
  markLatePaymentForReview,
} from "../services/bookingExpiryService.js";
import crypto from "crypto";
import mongoose from "mongoose";

const normalizeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const normalizePaymentCode = (value) => String(value || "").trim().toUpperCase();

const buildSepaySignature = ({ timestamp, rawBody, secret }) => {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return `sha256=${digest}`;
};

const signaturesMatch = (expected, received) => {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received || "");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

const verifySepaySignature = (req) => {
  const secret = process.env.SEPAY_WEBHOOK_SECRET;

  if (!secret) {
    return { valid: true };
  }

  const timestampHeader = String(req.get("X-SePay-Timestamp") || "");
  const timestamp = Number(timestampHeader);
  const signature = String(req.get("X-SePay-Signature") || "");
  const rawBody = req.rawBody || JSON.stringify(req.body || {});

  if (!Number.isFinite(timestamp) || !signature) {
    return { valid: false, message: "Thiếu timestamp hoặc chữ ký SePay" };
  }

  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return { valid: false, message: "Request SePay đã hết hạn" };
  }

  const expected = buildSepaySignature({ timestamp: timestampHeader, rawBody, secret });

  if (!signaturesMatch(expected, signature)) {
    return { valid: false, message: "Sai chữ ký SePay" };
  }

  return { valid: true };
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

const markSepayTransactionStatus = async ({
  transactionKey,
  bookingId = null,
  status,
  errorMessage = "",
  session = null,
}) => SepayTransaction.updateOne(
  { transaction_key: transactionKey },
  {
    $set: {
      booking_id: bookingId,
      processing_status: status,
      error_message: errorMessage,
      processed_at: new Date(),
    },
  },
  { session },
);

export const processSepayPayment = async ({ payload, transactionKey }) => {
  const paymentCode = normalizePaymentCode(payload.code);
  const transferType = String(payload.transferType || "").trim();
  const transferAmount = normalizeNumber(payload.transferAmount);

  if (transferType !== "in") {
    await markSepayTransactionStatus({
      transactionKey,
      status: "ignored",
      errorMessage: "Webhook không phải giao dịch tiền vào",
    });
    return;
  }

  if (!paymentCode) {
    await markSepayTransactionStatus({
      transactionKey,
      status: "ignored",
      errorMessage: "Webhook không có mã thanh toán",
    });
    return;
  }

  await runWithOptionalTransaction(async (session) => {
    const booking = await Booking.findOne({ booking_code: paymentCode }).session(session);

    if (!booking) {
      await markSepayTransactionStatus({
        transactionKey,
        status: "ignored",
        errorMessage: `Không tìm thấy đơn vé ${paymentCode}`,
        session,
      });
      return;
    }

    if (normalizeNumber(booking.total_price) !== transferAmount) {
      await markSepayTransactionStatus({
        transactionKey,
        bookingId: booking._id,
        status: "failed",
        errorMessage: "Số tiền SePay không khớp đơn vé",
        session,
      });
      return;
    }

    const transactionId = String(payload.referenceCode || payload.id || transactionKey);
    if (booking.payment_status === "expired" || isBookingPaymentExpired(booking)) {
      const expiryResult = await expirePendingBooking({ booking, session });
      const expiredBooking = expiryResult.booking || booking;
      const payment = await Payment.findOneAndUpdate(
        { provider: "sepay", transaction_ref: transactionKey },
        {
          $set: {
            booking_id: expiredBooking._id,
            payment_code: expiredBooking.booking_code,
            provider: "sepay",
            amount: transferAmount,
            status: "expired",
            transaction_ref: transactionKey,
            transaction_id: transactionId,
            bank_code: String(payload.gateway || ""),
            response_code: "00",
            transaction_status: "00",
            order_info: String(payload.content || ""),
            raw_return_data: payload,
          },
        },
        { upsert: true, returnDocument: "after", session },
      );

      await markLatePaymentForReview({
        booking: expiredBooking,
        payment,
        provider: "sepay",
        transactionId,
        session,
      });
      await markSepayTransactionStatus({
        transactionKey,
        bookingId: expiredBooking._id,
        status: "review_required",
        errorMessage: "Thanh toán đến sau khi đơn đã hết hạn; cần hoàn tiền/đối soát",
        session,
      });
      return;
    }

    const paidBooking = await markBookingAsPaid({
      booking,
      provider: "sepay",
      transactionId,
      session,
    });

    await Payment.findOneAndUpdate(
      { provider: "sepay", transaction_ref: transactionKey },
      {
        $set: {
          booking_id: paidBooking._id,
          payment_code: paidBooking.booking_code,
          provider: "sepay",
          amount: transferAmount,
          status: "paid",
          transaction_ref: transactionKey,
          transaction_id: transactionId,
          bank_code: String(payload.gateway || ""),
          response_code: "00",
          transaction_status: "00",
          order_info: String(payload.content || ""),
          raw_return_data: payload,
          paid_at: paidBooking.paid_at || new Date(),
        },
      },
      { upsert: true, returnDocument: "after", session },
    );

    await markSepayTransactionStatus({
      transactionKey,
      bookingId: paidBooking._id,
      status: "paid",
      session,
    });
  });
};

export const recordSepayTransaction = async ({ payload, source = "webhook" }) => {
  const rawId = String(payload.id == null ? "" : payload.id).trim();
  const referenceCode = String(payload.referenceCode || payload.reference_number || "");
  const transactionKey = `${source}:${rawId || referenceCode}`;

  if (!rawId && !referenceCode) {
    throw Object.assign(new Error("Payload SePay thiếu id hoặc referenceCode hợp lệ"), { statusCode: 400 });
  }

  const sepayTransaction = await SepayTransaction.findOneAndUpdate(
    { transaction_key: transactionKey },
    {
      $setOnInsert: {
        transaction_key: transactionKey,
        webhook_id: transactionKey,
        sepay_api_id: rawId,
        gateway: String(payload.gateway || payload.bank_brand_name || ""),
        transaction_date: String(payload.transactionDate || payload.transaction_date || ""),
        account_number: String(payload.accountNumber || payload.account_number || ""),
        sub_account: String(payload.subAccount || payload.va || ""),
        code: payload.code == null ? "" : String(payload.code),
        content: String(payload.content || payload.transaction_content || ""),
        description: String(payload.description || ""),
        transfer_type: String(payload.transferType || (normalizeNumber(payload.amount_in) > 0 ? "in" : "out")),
        transfer_amount: normalizeNumber(payload.transferAmount || payload.amount_in || payload.amount_out),
        accumulated: normalizeNumber(payload.accumulated),
        reference_code: referenceCode,
        raw_payload: payload,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: true,
    },
  );

  if (!sepayTransaction.lastErrorObject?.updatedExisting) {
    await processSepayPayment({ payload, transactionKey });
    return { inserted: true, transactionKey };
  }

  const existingTransaction = sepayTransaction.value || sepayTransaction;
  if (existingTransaction.processing_status === "received") {
    await processSepayPayment({ payload, transactionKey });
  }

  return { inserted: false, transactionKey };
};

export const receiveSepayWebhook = async (req, res) => {
  try {
    const signatureVerification = verifySepaySignature(req);

    if (!signatureVerification.valid) {
      return res.status(401).json({
        success: false,
        message: signatureVerification.message,
      });
    }

    const payload = req.body || {};

    await recordSepayTransaction({ payload, source: "webhook" });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true });
    }

    console.error("Khong the xu ly webhook SePay:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể xử lý webhook SePay",
    });
  }
};
