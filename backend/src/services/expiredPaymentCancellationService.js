import Payment from "../models/Payment.js";
import { cancelSepayPgOrder } from "./sepayPgPaymentService.js";

const MAX_CANCEL_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

const cancellationCandidates = (now) => ({
  provider: "sepay_pg",
  status: "expired",
  provider_cancel_status: { $nin: ["succeeded", "not_applicable"] },
  $and: [
    { $or: [
      { provider_cancel_attempts: { $exists: false } },
      { provider_cancel_attempts: { $lt: MAX_CANCEL_ATTEMPTS } },
    ] },
    { $or: [
      { provider_cancel_next_attempt_at: null },
      { provider_cancel_next_attempt_at: { $exists: false } },
      { provider_cancel_next_attempt_at: { $lte: now } },
    ] },
  ],
});

export const cancelExpiredSepayPgPayments = async ({
  now = new Date(),
  limit = 25,
  payments = Payment,
  cancelOrder = cancelSepayPgOrder,
} = {}) => {
  const candidates = await payments.find(cancellationCandidates(now)).sort({ created_at: 1 }).limit(limit);
  let succeeded = 0;

  for (const candidate of candidates) {
    const claimed = await payments.findOneAndUpdate(
      {
        _id: candidate._id,
        ...cancellationCandidates(now),
      },
      {
        $inc: { provider_cancel_attempts: 1 },
        $set: {
          provider_cancel_status: "pending",
          provider_cancel_attempted_at: now,
          provider_cancel_next_attempt_at: new Date(now.getTime() + RETRY_DELAY_MS),
          provider_cancel_error: "",
        },
      },
      { returnDocument: "after" },
    );
    if (!claimed) continue;

    try {
      await cancelOrder(claimed.transaction_ref || claimed.payment_code);
      await payments.updateOne(
        { _id: claimed._id },
        {
          $set: {
            provider_cancel_status: "succeeded",
            provider_cancel_next_attempt_at: null,
            provider_cancel_error: "",
          },
        },
      );
      succeeded += 1;
    } catch (error) {
      const terminalClientError = Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500
        && Number(error?.statusCode) !== 429;
      await payments.updateOne(
        { _id: claimed._id },
        {
          $set: {
            provider_cancel_status: terminalClientError ? "not_applicable" : "failed",
            provider_cancel_next_attempt_at: terminalClientError
              ? null
              : new Date(now.getTime() + RETRY_DELAY_MS),
            provider_cancel_error: String(error?.message || "Không thể hủy đơn SePay").slice(0, 500),
          },
        },
      );
    }
  }

  return { processed: candidates.length, succeeded };
};
