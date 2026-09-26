import { randomInt, randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import User from "../models/User.js";
import { assertEmailConfigured, sendOtpEmail } from "./emailService.js";

const scrypt = promisify(scryptCallback);
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;
const fields = { verification: "email_verification", recovery: "password_recovery" };
const error = (message, statusCode = 400, code = "OTP_INVALID") =>
  Object.assign(new Error(message), { publicMessage: message, statusCode, code });
const fieldFor = (purpose) => {
  if (!fields[purpose]) throw new Error("Unknown OTP purpose");
  return fields[purpose];
};
const eligible = (purpose) => ({
  deleted_at: null,
  $or: [
    { account_status: { $in: ["active", "unverified"] } },
    { account_status: { $exists: false }, status: true },
  ],
  ...(purpose === "verification" ? { email_verified_at: null } : {}),
});

export const hashOtp = async (otp) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(String(otp), salt, 64)).toString("hex")}`;
};
export const verifyOtpHash = async (otp, stored) => {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(String(otp), salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const issueEmailOtp = async ({ userId, purpose, now = new Date() }, {
  users = User, send = sendOtpEmail, assertConfigured = assertEmailConfigured,
} = {}) => {
  assertConfigured();
  const field = fieldFor(purpose);
  const base = { _id: userId, ...eligible(purpose) };
  // Persist email-level quotas in MongoDB so restarts and multiple servers cannot bypass them.
  await users.updateOne({ ...base, $and: [{ $or: [
    { [`${field}.window_start`]: null },
    { [`${field}.window_start`]: { $lte: new Date(now.getTime() - WINDOW_MS) } },
  ] }] }, { $set: { [`${field}.window_start`]: now, [`${field}.send_count`]: 0 } });
  const otp = String(randomInt(100000, 1000000));
  const requestId = randomUUID();
  const user = await users.findOneAndUpdate({
    ...base,
    [`${field}.send_count`]: { $lt: MAX_SENDS },
    $and: [{ $or: [
      { [`${field}.sent_at`]: null },
      { [`${field}.sent_at`]: { $lte: new Date(now.getTime() - OTP_COOLDOWN_MS) } },
    ] }],
  }, {
    $set: {
      [`${field}.hash`]: await hashOtp(otp),
      [`${field}.request_id`]: requestId,
      [`${field}.expires_at`]: new Date(now.getTime() + OTP_TTL_MS),
      [`${field}.sent_at`]: now,
      [`${field}.attempts`]: 0,
    },
    $inc: { [`${field}.send_count`]: 1 },
  }, { returnDocument: "after" });
  if (!user) throw error("Vui lòng chờ 60 giây giữa các lần gửi. Mỗi giờ chỉ được gửi tối đa 5 mã.", 429, "OTP_RATE_LIMITED");
  try {
    await send({ email: user.email, otp, purpose, requestId });
  } catch (cause) {
    // Invalidate only this request; a delayed failure must not clear a newer code.
    await users.updateOne({ _id: userId, [`${field}.request_id`]: requestId }, {
      $unset: { [`${field}.hash`]: 1, [`${field}.expires_at`]: 1 },
    });
    throw cause;
  }
  return { expires_in_seconds: OTP_TTL_MS / 1000, retry_after_seconds: OTP_COOLDOWN_MS / 1000 };
};

export const consumeEmailOtp = async ({ email, otp, purpose, passwordHash, now = new Date() }, {
  users = User,
} = {}) => {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw error("Mã OTP không chính xác", 400, "OTP_INVALID");
  }
  const field = fieldFor(purpose);
  const base = { email, ...eligible(purpose) };
  const currentUser = await users.findOne(base).select(`+${field}`);
  const currentChallenge = currentUser?.[field];

  if (!currentChallenge?.hash) {
    throw error("Mã OTP không chính xác", 400, "OTP_INVALID");
  }
  if (!currentChallenge.expires_at || currentChallenge.expires_at <= now) {
    throw error("Mã OTP đã hết hạn", 410, "OTP_EXPIRED");
  }
  if (Number(currentChallenge.attempts || 0) >= MAX_ATTEMPTS) {
    throw error(
      "Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới.",
      429,
      "OTP_ATTEMPTS_EXCEEDED",
    );
  }

  // Claim an attempt before expensive hashing; parallel guesses share the same budget.
  const user = await users.findOneAndUpdate({
    ...base,
    [`${field}.request_id`]: currentChallenge.request_id,
    [`${field}.hash`]: currentChallenge.hash,
    [`${field}.expires_at`]: { $gt: now },
    [`${field}.attempts`]: { $lt: MAX_ATTEMPTS },
  }, { $inc: { [`${field}.attempts`]: 1 } }, { returnDocument: "after" }).select(`+${field}`);
  const challenge = user?.[field];
  if (!challenge || !await verifyOtpHash(otp, challenge.hash)) {
    throw error("Mã OTP không chính xác", 400, "OTP_INVALID");
  }
  const changes = purpose === "verification" ? {
    email_verified_at: now, email_verification_required: false,
    account_status: "active", status: true,
    ...(!user.member_activated_at ? { member_activated_at: now } : {}),
  } : {
    password: passwordHash, password_changed_at: new Date(now.getTime() + 1000),
    password_reset_otp: null, password_reset_expires_at: null, password_reset_attempts: 0,
  };
  if (purpose === "recovery" && !passwordHash) throw new Error("Missing password hash");
  const result = await users.updateOne({
    ...base, _id: user._id,
    [`${field}.request_id`]: challenge.request_id,
    [`${field}.hash`]: challenge.hash,
    [`${field}.expires_at`]: { $gt: new Date(Math.max(Date.now(), now.getTime())) },
  }, {
    $set: changes,
    $unset: { [`${field}.hash`]: 1, [`${field}.expires_at`]: 1 },
  });
  if (result.modifiedCount !== 1) {
    throw error("Mã OTP không chính xác", 400, "OTP_INVALID");
  }
};
