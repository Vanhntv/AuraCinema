import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";
import User from "../models/User.js";

const scrypt = promisify(scryptCallback);

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

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
