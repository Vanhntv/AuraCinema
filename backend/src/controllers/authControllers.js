import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import User from "../models/User.js";
import { signJwt } from "../utils/jwt.js";

const scrypt = promisify(scryptCallback);

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

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
    const { full_name, email, password, phone, avatar } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
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
      phone: phone?.trim() || null,
      avatar: avatar || null,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
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

    const normalizedEmail = email.trim().toLowerCase();
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

    const userResponse = user.toObject();
    delete userResponse.password;

    const token = signJwt(
      {
        id: user._id.toString(),
        role_id: user.role_id,
      },
      process.env.JWT_SECRET,
      7 * 24 * 60 * 60
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
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
