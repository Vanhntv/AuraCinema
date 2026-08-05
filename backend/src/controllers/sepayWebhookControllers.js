import SepayTransaction from "../models/SepayTransaction.js";
import crypto from "crypto";

const normalizeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

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
    return true;
  }

  const timestamp = String(req.get("X-SePay-Timestamp") || "");
  const signature = String(req.get("X-SePay-Signature") || "");
  const rawBody = req.rawBody || JSON.stringify(req.body || {});

  if (!timestamp || !signature) {
    return false;
  }

  const expected = buildSepaySignature({ timestamp, rawBody, secret });
  return signaturesMatch(expected, signature);
};

export const receiveSepayWebhook = async (req, res) => {
  try {
    if (!verifySepaySignature(req)) {
      return res.status(401).json({
        success: false,
        message: "Sai chữ ký SePay",
      });
    }

    const payload = req.body || {};
    const webhookId = Number(payload.id);

    if (!Number.isFinite(webhookId)) {
      return res.status(400).json({
        success: false,
        message: "Payload SePay thiếu id hợp lệ",
      });
    }

    await SepayTransaction.findOneAndUpdate(
      { webhook_id: webhookId },
      {
        $setOnInsert: {
          webhook_id: webhookId,
          gateway: String(payload.gateway || ""),
          transaction_date: String(payload.transactionDate || ""),
          account_number: String(payload.accountNumber || ""),
          sub_account: String(payload.subAccount || ""),
          code: payload.code == null ? "" : String(payload.code),
          content: String(payload.content || ""),
          description: String(payload.description || ""),
          transfer_type: String(payload.transferType || ""),
          transfer_amount: normalizeNumber(payload.transferAmount),
          accumulated: normalizeNumber(payload.accumulated),
          reference_code: String(payload.referenceCode || ""),
          raw_payload: payload,
          processed_at: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể xử lý webhook SePay",
    });
  }
};
