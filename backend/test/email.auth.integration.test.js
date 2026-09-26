import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { register, login, verifyEmail, forgotPassword, resetPassword } from "../src/controllers/authControllers.js";
import { forceResetPassword, updateUserBasicInfo } from "../src/controllers/usersControllers.js";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { consumeEmailOtp, issueEmailOtp } from "../src/services/emailOtpService.js";
import { signJwt } from "../src/utils/jwt.js";

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const call = async (fn, body) => { const res = response(); await fn({ body, headers: {}, ip: "127.0.0.1" }, res); return res; };
const password = "CinemaTest123";

test("email auth with isolated MongoDB", { skip: process.env.RUN_EMAIL_AUTH_INTEGRATION !== "1" ? "Set RUN_EMAIL_AUTH_INTEGRATION=1; requires mongod" : false }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "aura-email-test-"));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const mongo = spawn(process.env.MONGOD_BINARY || "mongod", ["--dbpath", directory, "--port", String(port), "--bind_ip", "127.0.0.1", "--quiet"], { stdio: ["ignore", "pipe", "pipe"] });
  const oldFetch = globalThis.fetch;
  const oldEnv = { RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM, JWT_SECRET: process.env.JWT_SECRET };
  t.after(async () => {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await mongoose.disconnect();
    if (mongo.exitCode === null) { const stopped = new Promise(resolve => mongo.once("exit", resolve)); mongo.kill("SIGTERM"); await stopped; }
    await rm(directory, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Temporary MongoDB startup timed out")), 15000);
    const done = (error) => { clearTimeout(timeout); if (error) reject(error); else resolve(); };
    mongo.once("error", done);
    mongo.once("exit", code => done(new Error(`Temporary MongoDB exited: ${code}`)));
    mongo.stdout.on("data", chunk => { if (String(chunk).includes("Waiting for connections")) done(); });
    mongo.stderr.resume();
  });
  await mongoose.connect(`mongodb://127.0.0.1:${port}/email_auth_test`);
  await User.init();
  process.env.RESEND_API_KEY = "test-only";
  process.env.EMAIL_FROM = "AuraCinema <test@example.com>";
  process.env.JWT_SECRET = "test-only-secret-not-for-real-accounts";
  const mail = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    mail.push({ ...body, otp: body.text.match(/\b\d{6}\b/)[0] });
    return { ok: true, json: async () => ({ id: "test-message" }) };
  };
  let seq = 0;
  const signup = async () => {
    const email = `guest${++seq}@example.com`;
    const res = await call(register, { email, full_name: "Test Guest", password, confirm_password: password });
    assert.equal(res.statusCode, 201);
    return { email, otp: mail.at(-1).otp, user: await User.findOne({ email }), res };
  };
  const send = async ({ email, otp }) => mail.push({ to: [email], otp });
  const unlockSend = async (id, field = "email_verification") => User.updateOne({ _id: id }, { $set: { [`${field}.sent_at`]: new Date(0) } });

  await t.test("register does not issue JWT; verification activates and permits login", async () => {
    const { email, otp, user, res } = await signup();
    assert.equal(res.body.token, undefined);
    assert.equal(user.account_status, "unverified");
    assert.equal(user.member_activated_at, null);
    assert.equal(user.email_verification, undefined);
    assert.equal((await call(login, { email, password: "WrongPassword1" })).statusCode, 401);
    assert.equal((await call(login, { email, password })).body.code, "EMAIL_NOT_VERIFIED");
    assert.equal((await call(verifyEmail, { email, otp })).statusCode, 200);
    const loggedIn = await call(login, { email, password });
    assert.ok(loggedIn.body.token);
    assert.ok(loggedIn.body.data.email_verified_at);
    assert.ok(loggedIn.body.data.member_activated_at);
    assert.equal(loggedIn.body.data.email_verification, undefined);
    assert.equal((await call(verifyEmail, { email, otp })).statusCode, 400);
  });
  await t.test("re-registering pending email never replaces the password or sends unsolicited extra mail", async () => {
    const { email, user } = await signup();
    const count = mail.length;
    const res = await call(register, { email, full_name: "Other", password: "OtherPassword1", confirm_password: "OtherPassword1" });
    assert.equal(res.body.verification_required, true);
    assert.equal(mail.length, count);
    assert.equal((await User.findById(user._id)).password, user.password);
  });
  await t.test("five parallel guesses exhaust the code; expired codes are rejected", async () => {
    const { email, otp, user } = await signup();
    const wrong = otp === "999999" ? "888888" : "999999";
    const guesses = await Promise.allSettled(Array.from({ length: 8 }, () => consumeEmailOtp({ email, otp: wrong, purpose: "verification" })));
    assert.equal(guesses.filter(x => x.status === "rejected").length, 8);
    assert.equal((await User.findById(user._id).select("+email_verification")).email_verification.attempts, 5);
    await assert.rejects(consumeEmailOtp({ email, otp, purpose: "verification" }));
    const other = await signup();
    await User.updateOne({ _id: other.user._id }, { $set: { "email_verification.expires_at": new Date(0) } });
    await assert.rejects(consumeEmailOtp({ email: other.email, otp: other.otp, purpose: "verification" }));
  });
  await t.test("parallel successful verification consumes the code exactly once", async () => {
    const { email, otp } = await signup();
    const results = await Promise.allSettled([1, 2].map(() => consumeEmailOtp({ email, otp, purpose: "verification" })));
    assert.equal(results.filter(x => x.status === "fulfilled").length, 1);
  });
  await t.test("resend enforces cooldown, replaces old code, and caps sends per hour", async () => {
    const { email, otp, user } = await signup();
    await assert.rejects(issueEmailOtp({ userId: user._id, purpose: "verification" }, { send }), { statusCode: 429 });
    for (let i = 0; i < 4; i++) {
      await unlockSend(user._id);
      await issueEmailOtp({ userId: user._id, purpose: "verification" }, { send });
    }
    const latest = mail.at(-1).otp;
    await unlockSend(user._id);
    await assert.rejects(issueEmailOtp({ userId: user._id, purpose: "verification" }, { send }), { statusCode: 429 });
    if (latest !== otp) await assert.rejects(consumeEmailOtp({ email, otp, purpose: "verification" }));
    await consumeEmailOtp({ email, otp: latest, purpose: "verification" });
  });
  await t.test("banned accounts cannot be activated with a previously valid OTP", async () => {
    const { email, otp, user } = await signup();
    await User.updateOne({ _id: user._id }, { $set: { account_status: "banned", status: false } });
    await assert.rejects(consumeEmailOtp({ email, otp, purpose: "verification" }));
    assert.equal((await User.findById(user._id)).account_status, "banned");
  });
  await t.test("required verification is enforced by middleware even if admin sets active", async () => {
    const { user } = await signup();
    await User.updateOne({ _id: user._id }, { $set: { account_status: "active", status: true } });
    const token = signJwt({ id: user._id.toString(), role: "user" }, process.env.JWT_SECRET, 600);
    const res = response();
    await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail("must not authorize"));
    assert.equal(res.statusCode, 401);
  });
  await t.test("recovery sends real adapter mail, is purpose-bound, and invalidates sessions", async () => {
    const { email, otp } = await signup();
    await call(verifyEmail, { email, otp });
    const loggedIn = await call(login, { email, password });
    const requested = await call(forgotPassword, { email });
    assert.equal(requested.statusCode, 200);
    assert.equal(requested.body.dev_otp, undefined);
    const recoveryOtp = mail.at(-1).otp;
    const reset = await call(resetPassword, { email, otp: recoveryOtp, password: "NewPassword123", confirm_password: "NewPassword123" });
    assert.equal(reset.statusCode, 200);
    const res = response();
    await authMiddleware({ headers: { authorization: `Bearer ${loggedIn.body.token}` } }, res, () => assert.fail("old session must fail"));
    assert.equal(res.statusCode, 401);
    assert.equal((await call(login, { email, password })).statusCode, 401);
    await assert.rejects(consumeEmailOtp({ email, otp: recoveryOtp, purpose: "recovery", passwordHash: "unused" }));
    const pending = await signup();
    await call(forgotPassword, { email: pending.email });
    await assert.rejects(consumeEmailOtp({ email: pending.email, otp: pending.otp, purpose: "recovery", passwordHash: "unused" }));
    await call(resetPassword, { email: pending.email, otp: mail.at(-1).otp, password: "NewPassword123", confirm_password: "NewPassword123" });
    assert.equal((await User.findById(pending.user._id)).account_status, "unverified");
  });
  await t.test("delivery failure leaves a retryable pending account and invalidates unsent code", async () => {
    const { user } = await signup();
    await unlockSend(user._id);
    await assert.rejects(issueEmailOtp({ userId: user._id, purpose: "verification" }, { send: async () => { throw new Error("delivery failed"); } }));
    const current = await User.findById(user._id).select("+email_verification");
    assert.equal(current.account_status, "unverified");
    assert.equal(current.email_verification.hash, undefined);
  });
  await t.test("admin reset issues a usable recovery email without exposing OTP", async () => {
    const { user, email } = await signup();
    const res = response();
    await forceResetPassword({ params: { id: user._id.toString() }, user: { id: new mongoose.Types.ObjectId().toString() }, body: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.dev_otp, undefined);
    assert.equal((await call(resetPassword, { email, otp: mail.at(-1).otp, password: "NewPassword123", confirm_password: "NewPassword123" })).statusCode, 200);
  });
  await t.test("changing email clears verification and old challenges without unbanning", async () => {
    const { user, email, otp } = await signup();
    await call(verifyEmail, { email, otp });
    await call(forgotPassword, { email });
    await User.updateOne({ _id: user._id }, { $set: { account_status: "banned", status: false } });
    const res = response();
    await updateUserBasicInfo({ params: { id: user._id.toString() }, user: { id: new mongoose.Types.ObjectId().toString() }, body: { email: "changed@example.com" } }, res);
    assert.equal(res.statusCode, 200);
    const changed = await User.findById(user._id).select("+email_verification +password_recovery");
    assert.equal(changed.email, "changed@example.com");
    assert.equal(changed.email_verified_at, null);
    assert.equal(changed.email_verification_required, true);
    assert.equal(changed.account_status, "banned");
    assert.equal(changed.password_recovery, null);
    assert.equal(changed.email_verification, null);
  });
  await t.test("legacy active accounts stay accessible and are not falsely marked verified", async () => {
    const { user } = await signup();
    const legacy = await User.create({ email: "legacy@example.com", full_name: "Legacy", password: user.password });
    const res = await call(login, { email: legacy.email, password });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.data.email_verified_at, null);
  });
});
