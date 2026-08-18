import crypto from "crypto";
import {
  decryptQrToken,
  encryptQrToken,
  hashQrToken,
} from "./ticketService.js";

export const BOOKING_QR_PREFIX = "AURA_BOOKING_V2:";
const MAX_QR_PAYLOAD_LENGTH = 512;

export const buildBookingQrPayload = (token) =>
  `${BOOKING_QR_PREFIX}${String(token || "").trim()}`;

export const parseBookingQrPayload = (value) => {
  if (typeof value !== "string") return "";
  const payload = value.trim();
  if (
    !payload
    || payload.length > MAX_QR_PAYLOAD_LENGTH
    || !payload.startsWith(BOOKING_QR_PREFIX)
  ) {
    return "";
  }

  return payload.slice(BOOKING_QR_PREFIX.length).trim();
};

export const issueBookingOrderQr = (issuedAt = new Date()) => {
  const token = crypto.randomUUID();
  return {
    token_hash: hashQrToken(token),
    token_encrypted: encryptQrToken(token),
    issued_at: issuedAt,
  };
};

export const getBookingOrderQrPayload = (booking) => {
  if (Number(booking?.ticketing_version) !== 2) {
    throw Object.assign(new Error("Don ve cu khong ho tro QR don"), {
      statusCode: 409,
      code: "LEGACY_BOOKING_UNSUPPORTED",
    });
  }

  const encryptedToken = booking?.order_qr?.token_encrypted;
  if (!encryptedToken) {
    throw Object.assign(new Error("QR don ve chua san sang"), {
      statusCode: 409,
      code: "BOOKING_QR_NOT_READY",
    });
  }

  return buildBookingQrPayload(decryptQrToken(encryptedToken));
};
