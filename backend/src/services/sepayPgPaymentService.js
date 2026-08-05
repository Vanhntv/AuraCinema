import crypto from "crypto";

const CHECKOUT_BASE_URLS = {
  sandbox: "https://pay-sandbox.sepay.vn",
  production: "https://pay.sepay.vn",
};

const API_BASE_URLS = {
  sandbox: "https://pgapi-sandbox.sepay.vn",
  production: "https://pgapi.sepay.vn",
};

const SIGNED_CHECKOUT_FIELDS = [
  "merchant",
  "env",
  "operation",
  "payment_method",
  "order_amount",
  "currency",
  "order_invoice_number",
  "order_description",
  "customer_id",
  "agreement_id",
  "agreement_name",
  "agreement_type",
  "agreement_payment_frequency",
  "agreement_amount_per_payment",
  "success_url",
  "error_url",
  "cancel_url",
];

const normalizeString = (value) => String(value || "").trim();

const normalizeBankTransferText = (value) =>
  normalizeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getSepayPgConfig = () => {
  const environment = normalizeString(process.env.SEPAY_PG_ENV || "sandbox").toLowerCase();
  const env = environment === "production" ? "production" : "sandbox";
  const merchantId = normalizeString(process.env.SEPAY_PG_MERCHANT_ID);
  const secretKey = normalizeString(process.env.SEPAY_PG_SECRET_KEY);

  if (!merchantId || !secretKey) {
    throw Object.assign(new Error("Thiếu cấu hình SePay Payment Gateway"), { statusCode: 500 });
  }

  return {
    env,
    merchantId,
    secretKey,
    checkoutUrl: `${CHECKOUT_BASE_URLS[env]}/v1/checkout/init`,
    apiBaseUrl: API_BASE_URLS[env],
  };
};

export const signSepayPgCheckoutFields = (fields = {}) => {
  const { secretKey } = getSepayPgConfig();
  const signatureSource = SIGNED_CHECKOUT_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(fields, field))
    .map((field) => `${field}=${fields[field] ?? ""}`)
    .join(",");

  return crypto.createHmac("sha256", secretKey).update(signatureSource).digest("base64");
};

export const buildSepayPgCheckoutFields = ({ booking, amount, frontendUrl, customerName = "" }) => {
  const { env, merchantId, checkoutUrl } = getSepayPgConfig();
  const origin = normalizeString(frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const invoiceNumber = normalizeString(booking.booking_code).toUpperCase();
  const buyerName = normalizeBankTransferText(customerName || booking.user_id?.full_name || "Khach hang");

  const fields = {
    merchant: merchantId,
    env,
    operation: "PURCHASE",
    order_amount: String(Math.round(Number(amount || 0))),
    currency: "VND",
    order_invoice_number: invoiceNumber,
    order_description: `${buyerName} thanh toan don ve ${invoiceNumber}`,
    customer_id: String(booking.user_id?._id || booking.user_id || ""),
    success_url: `${origin}/payment/sepay-pg-return?booking_id=${booking._id}&invoice=${invoiceNumber}`,
    error_url: `${origin}/booking/failed`,
    cancel_url: `${origin}/booking/failed`,
  };

  fields.signature = signSepayPgCheckoutFields(fields);

  return { checkoutUrl, fields };
};

export const fetchSepayPgOrder = async (invoiceNumber) => {
  const { merchantId, secretKey, apiBaseUrl } = getSepayPgConfig();
  const credentials = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");
  const response = await fetch(`${apiBaseUrl}/v1/order/detail/${encodeURIComponent(invoiceNumber)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw Object.assign(new Error(data?.message || "Không thể lấy trạng thái đơn SePay"), {
      statusCode: response.status,
      data,
    });
  }

  return data;
};
