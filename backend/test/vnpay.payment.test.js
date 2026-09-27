import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVnpayPaymentUrl,
  parseVnpayDate,
  verifyVnpayReturnParams,
} from "../src/services/vnpayPaymentService.js";
import { receiveVnpayIpn } from "../src/controllers/paymentsControllers.js";

const withVnpayEnv = async (callback) => {
  const previous = {
    VNP_TMN_CODE: process.env.VNP_TMN_CODE,
    VNP_HASH_SECRET: process.env.VNP_HASH_SECRET,
    VNP_URL: process.env.VNP_URL,
    VNP_RETURN_URL: process.env.VNP_RETURN_URL,
  };
  Object.assign(process.env, {
    VNP_TMN_CODE: "TESTCODE",
    VNP_HASH_SECRET: "test-secret",
    VNP_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    VNP_RETURN_URL: "http://localhost:5173/payment/vnpay-return",
  });
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("VNPay receives the booking's exact five-minute payment deadline", async () => {
  await withVnpayEnv(async () => {
    const now = new Date("2026-09-27T03:00:00.000Z");
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const result = buildVnpayPaymentUrl({
      bookingId: "booking-1",
      amount: 225000,
      ipAddr: "127.0.0.1",
      frontendUrl: "http://localhost:5173",
      expiresAt,
      now,
    });

    assert.equal(result.vnpParams.vnp_CreateDate, "20260927100000");
    assert.equal(result.vnpParams.vnp_ExpireDate, "20260927100500");
    assert.equal(parseVnpayDate(result.vnpParams.vnp_ExpireDate).toISOString(), expiresAt.toISOString());

    const query = Object.fromEntries(new URL(result.paymentUrl).searchParams.entries());
    assert.equal(verifyVnpayReturnParams(query).isValid, true);
  });
});

test("VNPay checkout cannot extend or use an expired booking deadline", async () => {
  await withVnpayEnv(async () => {
    assert.throws(() => buildVnpayPaymentUrl({
      bookingId: "booking-1",
      amount: 225000,
      ipAddr: "127.0.0.1",
      expiresAt: new Date("2026-09-27T02:59:59.000Z"),
      now: new Date("2026-09-27T03:00:00.000Z"),
    }), { statusCode: 410 });
  });
});

test("VNPay IPN returns the provider response code for an invalid signature", async () => {
  await withVnpayEnv(async () => {
    const res = response();
    await receiveVnpayIpn({ query: { vnp_SecureHash: "invalid" } }, res);
    assert.deepEqual(res.body, { RspCode: "97", Message: "Invalid signature" });
  });
});
