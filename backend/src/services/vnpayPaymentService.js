import crypto from "crypto";
import moment from "moment";
import qs from "qs";

const normalizeString = (value = "") => String(value || "").trim();
const normalizeMoney = (value) => Math.round(Number(value || 0));

export const sortObject = (input = {}) =>
  Object.keys(input)
    .sort()
    .reduce((result, key) => {
      const encodedKey = encodeURIComponent(key);
      result[encodedKey] = encodeURIComponent(input[key]).replace(/%20/g, "+");
      return result;
    }, {});

export const getClientIp = (req) =>
  normalizeString(
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    "127.0.0.1",
  ).split(",")[0];

export const getVnpayConfig = () => {
  const tmnCode = normalizeString(process.env.VNP_TMN_CODE);
  const hashSecret = normalizeString(process.env.VNP_HASH_SECRET);
  const vnpUrl = normalizeString(process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
  const returnUrl = normalizeString(process.env.VNP_RETURN_URL || "http://localhost:5173/payment/vnpay-return");

  if (!tmnCode || !hashSecret) {
    throw Object.assign(new Error("Chưa cấu hình VNP_TMN_CODE/VNP_HASH_SECRET"), { statusCode: 503 });
  }

  return { tmnCode, hashSecret, vnpUrl, returnUrl };
};

export const resolveVnpayReturnUrl = (frontendUrl) => {
  const normalizedFrontendUrl = normalizeString(frontendUrl).replace(/\/+$/, "");
  if (normalizedFrontendUrl) {
    return `${normalizedFrontendUrl}/payment/vnpay-return`;
  }

  const { returnUrl } = getVnpayConfig();
  return returnUrl;
};

export const signVnpayParams = ({ params, hashSecret }) => {
  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const signed = crypto.createHmac("sha512", hashSecret).update(Buffer.from(signData, "utf-8")).digest("hex");

  return { sortedParams, secureHash: signed };
};

export const buildVnpayPaymentUrl = ({ bookingId, amount, ipAddr, frontendUrl }) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const { tmnCode, hashSecret, vnpUrl } = getVnpayConfig();
  const returnUrl = resolveVnpayReturnUrl(frontendUrl);
  const normalizedAmount = normalizeMoney(amount);

  if (!bookingId) {
    throw Object.assign(new Error("booking_id là bắt buộc"), { statusCode: 400 });
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw Object.assign(new Error("Số tiền thanh toán không hợp lệ"), { statusCode: 400 });
  }

  const createDate = moment(new Date()).format("YYYYMMDDHHmmss");
  const vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: normalizedAmount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: bookingId,
    vnp_OrderInfo: `Thanh toan don ve ${bookingId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_Locale: "vn",
  };

  const { sortedParams, secureHash } = signVnpayParams({ params: vnpParams, hashSecret });
  const signedParams = {
    ...sortedParams,
    vnp_SecureHash: secureHash,
  };

  return {
    paymentUrl: `${vnpUrl}?${qs.stringify(signedParams, { encode: false })}`,
    vnpParams,
    secureHash,
  };
};

export const verifyVnpayReturnParams = (query = {}) => {
  const { hashSecret } = getVnpayConfig();
  const vnpParams = { ...query };
  const secureHash = normalizeString(vnpParams.vnp_SecureHash);

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  const { secureHash: signed } = signVnpayParams({ params: vnpParams, hashSecret });

  return {
    isValid: Boolean(secureHash) && secureHash === signed,
    signed,
    secureHash,
    params: vnpParams,
  };
};
