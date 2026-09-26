import assert from "node:assert/strict";
import test from "node:test";
import { sendOtpEmail } from "../src/services/emailService.js";
import { hashOtp, verifyOtpHash } from "../src/services/emailOtpService.js";
import { createAuthEmailRateLimit } from "../src/middleware/authEmailRateLimit.js";

const env = { RESEND_API_KEY: "test-key", EMAIL_FROM: "AuraCinema <mail@example.com>" };
const message = { email: "guest@example.com", otp: "123456", purpose: "verification", requestId: "request-1" };
test("email adapter sends a verification email with idempotency and timeout", async () => {
  const result = await sendOtpEmail(message, { env, fetchFn: async (url, request) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(request.headers["Idempotency-Key"], "request-1");
    assert.ok(request.signal);
    const body = JSON.parse(request.body);
    assert.deepEqual(body.to, [message.email]);
    assert.match(body.subject, /xác minh email/);
    assert.match(body.text, /123456/);
    return { ok: true, json: async () => ({ id: "email-id" }) };
  } });
  assert.deepEqual(result, { id: "email-id" });
});
test("email adapter fails closed and does not expose provider secrets", async () => {
  await assert.rejects(sendOtpEmail(message, { env: {} }), { code: "EMAIL_DELIVERY_FAILED" });
  for (const fetchFn of [async () => { throw new Error("secret-key 123456"); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({}) })]) {
    await assert.rejects(sendOtpEmail(message, { env, fetchFn }), (error) => {
      assert.equal(error.statusCode, 503);
      assert.doesNotMatch(error.message, /secret-key|123456/);
      return true;
    });
  }
});
test("OTP hashes are salted and comparison rejects wrong or malformed values", async () => {
  const hash = await hashOtp("123456");
  assert.notEqual(hash, await hashOtp("123456"));
  assert.equal(await verifyOtpHash("123456", hash), true);
  assert.equal(await verifyOtpHash("654321", hash), false);
  assert.equal(await verifyOtpHash("123456", ""), false);
});
test("IP rate limit cannot be bypassed with spoofed forwarded headers", () => {
  const limit = createAuthEmailRateLimit({ max: 1 });
  let next = 0;
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  limit({ ip: "127.0.0.1", headers: { "x-forwarded-for": "1.1.1.1" } }, res, () => next++);
  limit({ ip: "127.0.0.1", headers: { "x-forwarded-for": "2.2.2.2" } }, res, () => next++);
  assert.equal(next, 1);
  assert.equal(res.code, 429);
});
