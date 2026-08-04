import Booking from "../models/Booking.js";
import SepayTransaction from "../models/SepayTransaction.js";
import { markBookingAsPaid } from "./bookingsControllers.js";

const BOOKING_CODE_PATTERN = /AURA[-A-Z0-9]*/ig;

const normalizeString = (value = "") => String(value || "").trim();

const normalizeMoney = (value) => Math.round(Number(value || 0));

const buildReferenceCode = (payload = {}) => {
  const referenceCode = normalizeString(payload.referenceCode);
  if (referenceCode) return referenceCode;

  const transactionDate = normalizeString(payload.transactionDate);
  const amount = normalizeString(payload.transferAmount);
  const content = normalizeString(payload.content);
  return `${transactionDate}|${amount}|${content}`;
};

const extractBookingCode = (payload = {}) => {
  const searchableText = [
    payload.code,
    payload.content,
    payload.description,
  ].map(normalizeString).join(" ");

  const matches = searchableText.match(BOOKING_CODE_PATTERN) || [];
  const bookingCode = matches.find((match) => match.replace(/[^A-Z0-9]/gi, "").length > 8);
  return bookingCode ? bookingCode.toUpperCase() : "";
};

const compactBookingCode = (bookingCode = "") =>
  normalizeString(bookingCode).replace(/[^A-Z0-9]/gi, "").toUpperCase();

const findBookingByCode = async (bookingCode) => {
  const normalizedBookingCode = normalizeString(bookingCode).toUpperCase();
  const compactCode = compactBookingCode(normalizedBookingCode);

  const exactBooking = await Booking.findOne({ booking_code: normalizedBookingCode });
  if (exactBooking || !compactCode) return exactBooking;

  const candidates = await Booking.find({
    booking_code: new RegExp(`^${normalizedBookingCode.slice(0, 4)}`, "i"),
  }).limit(100);

  return candidates.find((booking) => compactBookingCode(booking.booking_code) === compactCode) || null;
};

const createTransactionLog = async ({ payload, referenceCode, bookingCode }) => {
  try {
    return await SepayTransaction.create({
      reference_code: referenceCode,
      booking_code: bookingCode,
      gateway: normalizeString(payload.gateway),
      transaction_date: payload.transactionDate ? new Date(payload.transactionDate) : null,
      account_number: normalizeString(payload.accountNumber),
      sub_account: normalizeString(payload.subAccount),
      transfer_type: normalizeString(payload.transferType),
      transfer_amount: normalizeMoney(payload.transferAmount),
      accumulated: normalizeMoney(payload.accumulated),
      code: normalizeString(payload.code),
      content: normalizeString(payload.content),
      description: normalizeString(payload.description),
      raw_payload: payload,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return SepayTransaction.findOne({ reference_code: referenceCode });
    }

    throw error;
  }
};

const updateTransactionLog = async (transaction, updates) => {
  if (!transaction) return;

  Object.assign(transaction, updates);
  await transaction.save();
};

const processSepayWebhook = async (payload) => {
  const referenceCode = buildReferenceCode(payload);
  const bookingCode = extractBookingCode(payload);
  const transaction = await createTransactionLog({ payload, referenceCode, bookingCode });

  if (transaction?.status === "processed") {
    return;
  }

  if (normalizeString(payload.transferType).toLowerCase() !== "in") {
    await updateTransactionLog(transaction, {
      status: "ignored",
      error_message: "Không phải giao dịch tiền vào",
      processed_at: new Date(),
    });
    return;
  }

  if (!bookingCode) {
    await updateTransactionLog(transaction, {
      status: "failed",
      error_message: "Không tìm thấy mã booking trong nội dung giao dịch",
      processed_at: new Date(),
    });
    return;
  }

  const booking = await findBookingByCode(bookingCode);
  if (!booking) {
    await updateTransactionLog(transaction, {
      status: "failed",
      error_message: `Không tìm thấy booking ${bookingCode}`,
      processed_at: new Date(),
    });
    return;
  }

  const transferAmount = normalizeMoney(payload.transferAmount);
  const bookingTotal = normalizeMoney(booking.total_price);
  if (transferAmount !== bookingTotal) {
    await updateTransactionLog(transaction, {
      booking_id: booking._id,
      status: "failed",
      error_message: `Sai số tiền: nhận ${transferAmount}, cần ${bookingTotal}`,
      processed_at: new Date(),
    });
    return;
  }

  const paidBooking = await markBookingAsPaid({
    booking,
    provider: "sepay",
    transactionId: referenceCode,
  });

  await updateTransactionLog(transaction, {
    booking_id: paidBooking._id,
    status: "processed",
    error_message: "",
    processed_at: new Date(),
  });
};

export const receiveSepayWebhook = (req, res) => {
  const payload = req.body;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ success: false, message: "No data" });
  }

  res.json({ success: true, message: "Webhook accepted" });

  setImmediate(() => {
    processSepayWebhook(payload).catch((error) => {
      console.error("SePay webhook processing failed:", error);
    });
  });
};
