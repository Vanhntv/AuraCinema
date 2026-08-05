import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { markBookingAsPaid } from "./bookingsControllers.js";
import {
  buildVnpayPaymentUrl,
  getClientIp,
  verifyVnpayReturnParams,
} from "../services/vnpayPaymentService.js";

const normalizeMoney = (value) => Math.round(Number(value || 0));

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

    if (booking.status !== "pending" || booking.payment_status !== "pending") {
      return res.status(409).json({ success: false, message: "Đơn vé không còn ở trạng thái chờ thanh toán" });
    }

    const bookingAmount = normalizeMoney(booking.total_price);
    if (requestedAmount !== bookingAmount) {
      return res.status(400).json({ success: false, message: "Số tiền thanh toán không khớp đơn vé" });
    }

    const { paymentUrl, vnpParams, secureHash } = buildVnpayPaymentUrl({
      bookingId,
      amount: bookingAmount,
      ipAddr: getClientIp(req),
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

      if (booking.payment_status === "pending") {
        booking.payment_status = "failed";
        booking.payment_provider = "vnpay";
        booking.payment_transaction_id = String(params.vnp_TransactionNo || params.vnp_BankTranNo || "");
        await booking.save({ session });
      }

      return { booking, payment };
    });

    return res.json({
      success,
      message: success ? "Thanh toán VNPay thành công" : "Thanh toán VNPay thất bại",
      data: {
        booking_id: result.booking._id,
        booking_status: result.booking.status,
        payment_status: result.booking.payment_status,
        payment_id: result.payment._id,
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: transactionStatus,
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
