import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import User from "../models/User.js";
import RewardPointLog from "../models/RewardPointLog.js";
import { membershipView } from "../services/loyaltyPolicy.js";
import { signJwt } from "../utils/jwt.js";
import { requestAccountChange, getApprovedPasswordRequest, applyApprovedPasswordChange } from "../services/accountApprovalService.js";

import { issueEmailOtp, consumeEmailOtp } from "../services/emailOtpService.js";
import { assertEmailConfigured } from "../services/emailService.js";
import {
  normalizeEmailKey,
  validateEmailSyntax,
  validateRegistrationEmail,
} from "../services/emailValidationService.js";

const scrypt = promisify(scryptCallback);
const DEFAULT_ROLE = "user";
const USER_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const ADMIN_TOKEN_TTL_SECONDS = 2 * 60 * 60;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

const resolveUserRole = (user) => ["admin", "staff"].includes(String(user?.role || "").trim().toLowerCase())
  ? String(user.role).trim().toLowerCase()
  : DEFAULT_ROLE;

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /\d/.test(password);

const getTokenTtlSeconds = (user) =>
  resolveUserRole(user) === "admin" ? ADMIN_TOKEN_TTL_SECONDS : USER_TOKEN_TTL_SECONDS;

const getRateLimitKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  return `${ip}:${normalizeEmailKey(req.body?.email)}`;
};

const resetLoginAttempts = (req) => {
  loginAttempts.delete(getRateLimitKey(req));
};

const activeUserQuery = {
  $or: [
    { account_status: "active" },
    { account_status: { $exists: false }, status: true },
  ],
};

const SERVER_ERROR_MESSAGE = "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";

const getValidationMessage = (error) => {
  if (error?.name === "ValidationError") {
    const messages = Object.values(error.errors || {})
      .map((item) => item?.message)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(". ");
    }

    return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
  }

  if (error?.code === 11000) {
    return "Dữ liệu đã tồn tại. Vui lòng kiểm tra lại.";
  }

  return "";
};

const sendAuthError = (res, error, fallback = SERVER_ERROR_MESSAGE) => {
  const validationMessage = getValidationMessage(error);
  const statusCode = error?.statusCode || (validationMessage ? 400 : 500);

  if (statusCode >= 500) {
    console.error("Auth error:", error.code || error.name || "UNKNOWN");
  }

  return res.status(statusCode).json({
    success: false,
    message: validationMessage || error?.publicMessage || fallback,
    code: error?.code,
    ...(error?.suggested_email ? { suggested_email: error.suggested_email } : {}),
  });
};

export const loginRateLimit = (req, res, next) => {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (current.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfterSeconds));

    return res.status(429).json({
      success: false,
      message: "Bạn đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
      retry_after_seconds: retryAfterSeconds,
    });
  }

  current.count += 1;
  loginAttempts.set(key, current);
  return next();
};

export const verifyPassword = async (password, storedPassword) => {
  if (typeof storedPassword !== "string" || !storedPassword.includes(":")) {
    return false;
  }

  const [salt, key] = storedPassword.split(":");

  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, 64);
  const storedKeyBuffer = Buffer.from(key, "hex");
  const derivedKeyBuffer = Buffer.from(derivedKey);

  if (storedKeyBuffer.length !== derivedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedKeyBuffer, derivedKeyBuffer);
};

const sanitizeUser = (user) => {
  const userResponse = user.toObject ? user.toObject() : { ...user };
  delete userResponse.password;
  delete userResponse.email_verification;
  delete userResponse.password_recovery;
  delete userResponse.password_reset_otp;
  delete userResponse.password_reset_expires_at;
  delete userResponse.password_reset_attempts;
  userResponse.role = resolveUserRole(user);
  userResponse.emailVerified = Boolean(userResponse.email_verified_at);
  return userResponse;
};

const parseBirthDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    const error = new Error("Ngày sinh không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (birthDate > today) {
    const error = new Error("Ngày sinh không thể lớn hơn ngày hiện tại");
    error.statusCode = 400;
    throw error;
  }

  return birthDate;
};

const parseGender = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (!["male", "female", "other"].includes(value)) {
    const error = new Error("Giới tính không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  return value;
};

export const register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, phone, avatar } = req.body;

    if (!full_name || !email || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email, mật khẩu và xác nhận mật khẩu",
      });
    }

    const { emailKey: normalizedEmail } = await validateRegistrationEmail(email);

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
    });

    if (existingUser?.account_status === "unverified") {
      return res.status(200).json({ success: true, verification_required: true,
        email: normalizedEmail, message: "Tài khoản đang chờ xác minh. Vui lòng nhập mã đã nhận hoặc yêu cầu gửi lại." });
    }
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    assertEmailConfigured();
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: DEFAULT_ROLE,
      account_status: "unverified",
      status: false,
      email_verification_required: true,
      phone: phone?.trim() || null,
      avatar: avatar || null,
    });

    try {
      const timing = await issueEmailOtp({ userId: user._id, purpose: "verification" });
      return res.status(201).json({ success: true, verification_required: true,
        email: normalizedEmail, ...timing, message: "Đã gửi mã xác minh đến email của bạn." });
    } catch (error) {
      if (![429, 503].includes(error.statusCode)) throw error;
      return res.status(201).json({ success: true, verification_required: true,
        email: normalizedEmail, email_sent: false, retry_after_seconds: 60,
        message: "Tài khoản đã được tạo nhưng chưa gửi được email. Vui lòng gửi lại mã sau 60 giây." });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    return sendAuthError(res, error, "Đăng ký thất bại. Vui lòng thử lại sau.");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const { emailKey: normalizedEmail } = validateEmailSyntax(email);
    const user = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
      $or: [
        { account_status: { $in: ["active", "unverified"] } },
        { account_status: { $exists: false }, status: true },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    if (user.account_status === "unverified" || user.email_verification_required) {
      return res.status(403).json({ success: false, code: "EMAIL_NOT_VERIFIED",
        message: "Vui lòng xác minh email trước khi đăng nhập." });
    }
    resetLoginAttempts(req);

    const accountStatus = user.account_status || (user.status ? "active" : "banned");
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          account_status: accountStatus,
          status: accountStatus === "active",
          last_login_at: new Date(),
        },
      },
      { runValidators: false },
    );
    user.account_status = accountStatus;
    user.status = accountStatus === "active";
    user.last_login_at = new Date();

    const userResponse = sanitizeUser(user);

    const token = signJwt(
      {
        id: user._id.toString(),
        role_id: user.role_id,
        role: resolveUserRole(user),
      },
      process.env.JWT_SECRET,
      getTokenTtlSeconds(user)
    );

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      data: userResponse,
    });
  } catch (error) {
    return sendAuthError(res, error, "Đăng nhập thất bại. Vui lòng thử lại sau.");
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng",
      });
    }

    const { emailKey: normalizedEmail } = validateEmailSyntax(email);
    const user = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
      $or: [{ account_status: { $in: ["active", "unverified"] } },
        { account_status: { $exists: false }, status: true }],
    });

    const responsePayload = {
      success: true,
      message: "Nếu tài khoản đủ điều kiện, mã OTP đặt lại mật khẩu đã được gửi. Tài khoản admin cần một admin khác phê duyệt yêu cầu trước khi nhận OTP.",
    };

    if (!user) {
      return res.status(200).json(responsePayload);
    }

    if (resolveUserRole(user) !== "admin") {
      await issueEmailOtp({ userId: user._id, purpose: "recovery" });
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    return sendAuthError(res, error, "Không thể gửi OTP. Vui lòng thử lại sau.");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password, confirm_password } = req.body;

    if (!email || !otp || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email, OTP, mật khẩu mới và xác nhận mật khẩu",
      });
    }

    const { emailKey: normalizedEmail } = validateEmailSyntax(email);

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    const target = await User.findOne({ email: normalizedEmail, deleted_at: null });
    let approvedRequest = null;
    if (target?.role === "admin") {
      approvedRequest = await getApprovedPasswordRequest({ requestId: req.body.approval_request_id, targetId: target._id, kind: "password_reset" });
    }
    await consumeEmailOtp({ email: normalizedEmail, otp: String(otp).trim(),
      purpose: "recovery", passwordHash: await hashPassword(password) });
    if (approvedRequest) {
      approvedRequest.status = "applied";
      approvedRequest.applied_at = new Date();
      await approvedRequest.save();
    }

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    return sendAuthError(res, error, "Không thể đặt lại mật khẩu. Vui lòng thử lại sau.");
  }
};

export const profile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id, deleted_at: null }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }


    const rewardPointLogs = await RewardPointLog.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50)
      .select("type points balance_after reason created_at booking_id");

    return res.status(200).json({
      success: true,
      data: {
        ...sanitizeUser(user),
        membership: membershipView(user),
        reward_point_logs: rewardPointLogs,
      },
    });
  } catch (error) {
    return sendAuthError(res, error, "Không thể tải thông tin tài khoản. Vui lòng thử lại sau.");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = {};
    const { full_name, birth_date, gender, address, avatar } = req.body;

    if (full_name !== undefined) {
      const normalizedName = String(full_name).trim();
      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống",
        });
      }
      allowedFields.full_name = normalizedName;
    }

    if (birth_date !== undefined) {
      allowedFields.birth_date = parseBirthDate(birth_date);
    }

    if (gender !== undefined) {
      allowedFields.gender = parseGender(gender);
    }

    if (address !== undefined) {
      allowedFields.address = String(address || "").trim() || null;
    }

    if (avatar !== undefined) {
      allowedFields.avatar = String(avatar || "").trim() || null;
    }

    if (req.user.role === "admin") {
      const request = await requestAccountChange({
        targetId: req.user.id, requesterId: req.user.id, kind: "profile",
        changes: allowedFields, reason: req.body.reason || "Admin tự cập nhật hồ sơ",
      });
      return res.status(202).json({ success: true, message: "Đã gửi thay đổi hồ sơ, chờ một admin khác phê duyệt", data: request });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        deleted_at: null,
        ...activeUserQuery,
      },
      allowedFields,
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: sanitizeUser(user),
    });
  } catch (error) {
    return sendAuthError(res, error, "Cập nhật thông tin thất bại. Vui lòng thử lại sau.");
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, password, confirm_password } = req.body;

    if (!current_password || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    const user = await User.findOne({
      _id: req.user.id,
      deleted_at: null,
      ...activeUserQuery,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const isCurrentPasswordValid = await verifyPassword(current_password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    if (resolveUserRole(user) === "admin") {
      if (!req.body.approval_request_id) {
        const request = await requestAccountChange({
          targetId: user._id, requesterId: user._id, kind: "password_change",
          reason: "Admin yêu cầu tự đổi mật khẩu",
        });
        return res.status(202).json({ success: true, message: "Đã gửi yêu cầu đổi mật khẩu. Sau khi một admin khác duyệt, hãy nhập lại mật khẩu để hoàn tất.", data: request });
      }
      await applyApprovedPasswordChange({ requestId: req.body.approval_request_id, targetId: user._id, passwordHash: await hashPassword(password) });
    } else {
      user.password = await hashPassword(password);
      user.password_changed_at = new Date(Date.now() + 1000);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    return sendAuthError(res, error, "Đổi mật khẩu thất bại. Vui lòng thử lại sau.");
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { emailKey: email } = validateEmailSyntax(req.body.email);
    const user = await User.findOne({ email, deleted_at: null, email_verified_at: null,
      account_status: { $in: ["unverified", "active"] } });
    if (user) await issueEmailOtp({ userId: user._id, purpose: "verification" });
    return res.json({ success: true, retry_after_seconds: 60, expires_in_seconds: 600,
      message: "Nếu tài khoản cần xác minh, mã mới sẽ được gửi đến email của bạn. Hãy kiểm tra cả thư rác." });
  } catch (error) { return sendAuthError(res, error, "Không thể gửi mã xác minh."); }
};

export const verifyEmail = async (req, res) => {
  try {
    const { emailKey: email } = validateEmailSyntax(req.body.email);
    await consumeEmailOtp({ email, otp: String(req.body.otp || "").trim(), purpose: "verification" });
    return res.json({ success: true, message: "Xác minh email thành công. Vui lòng đăng nhập." });
  } catch (error) { return sendAuthError(res, error, "Không thể xác minh email."); }
};
