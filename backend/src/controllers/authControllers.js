import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import User from "../models/User.js";
import { signJwt } from "../utils/jwt.js";

const scrypt = promisify(scryptCallback);
const DEFAULT_ROLE = "user";
const USER_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const ADMIN_TOKEN_TTL_SECONDS = 2 * 60 * 60;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

const resolveUserRole = (user) => {
  return user.role === "admin" || user.role_id === 1 ? "admin" : DEFAULT_ROLE;
};

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /\d/.test(password);

const getTokenTtlSeconds = (user) =>
  resolveUserRole(user) === "admin" ? ADMIN_TOKEN_TTL_SECONDS : USER_TOKEN_TTL_SECONDS;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getRateLimitKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  return `${ip}:${normalizeEmail(req.body?.email)}`;
};

const resetLoginAttempts = (req) => {
  loginAttempts.delete(getRateLimitKey(req));
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

const verifyPassword = async (password, storedPassword) => {
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

export const register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, phone, avatar } = req.body;

    if (!full_name || !email || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email, mật khẩu và xác nhận mật khẩu",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
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

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: DEFAULT_ROLE,
      phone: phone?.trim() || null,
      avatar: avatar || null,
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.role = resolveUserRole(user);

    const token = signJwt(
      {
        id: user._id.toString(),
        role_id: user.role_id,
        role: resolveUserRole(user),
      },
      process.env.JWT_SECRET,
      getTokenTtlSeconds(user)
    );

    return res.status(201).json({
      success: true,
      token,
      message: "Đăng ký thành công",
      data: userResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
      status: true,
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

    resetLoginAttempts(req);

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.role = resolveUserRole(user);

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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      deleted_at: null,
      status: true,
    });

    const responsePayload = {
      success: true,
      message: "Nếu email tồn tại, mã OTP đặt lại mật khẩu đã được gửi.",
    };

    if (!user) {
      return res.status(200).json(responsePayload);
    }

    const otp = String(randomInt(100000, 1000000));
    user.password_reset_otp = await hashPassword(otp);
    user.password_reset_expires_at = new Date(Date.now() + RESET_OTP_TTL_MS);
    user.password_reset_attempts = 0;
    await user.save();

    if (process.env.NODE_ENV !== "production") {
      responsePayload.dev_otp = otp;
      console.log(`Password reset OTP for ${normalizedEmail}: ${otp}`);
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
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
      email: normalizeEmail(email),
      deleted_at: null,
      status: true,
    });

    if (
      !user ||
      !user.password_reset_otp ||
      !user.password_reset_expires_at ||
      user.password_reset_expires_at <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
      });
    }

    if (user.password_reset_attempts >= RESET_OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Bạn nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
      });
    }

    const isOtpValid = await verifyPassword(String(otp), user.password_reset_otp);

    if (!isOtpValid) {
      user.password_reset_attempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
      });
    }

    user.password = await hashPassword(password);
    user.password_reset_otp = null;
    user.password_reset_expires_at = null;
    user.password_reset_attempts = 0;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const profile = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.id,
      deleted_at: null,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        role: resolveUserRole(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
