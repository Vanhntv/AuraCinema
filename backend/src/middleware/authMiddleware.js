import { verifyJwt } from "../utils/jwt.js";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    const payload = verifyJwt(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: payload.id,
      deleted_at: null,
      status: true,
    }).select("_id role role_id password_changed_at");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    if (
      user.password_changed_at &&
      payload.iat &&
      Math.floor(user.password_changed_at.getTime() / 1000) > payload.iat
    ) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại",
      });
    }

    req.user = {
      id: user._id.toString(),
      role_id: user.role_id,
      role: user.role === "admin" || user.role_id === 1 ? "admin" : "user",
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message === "Token expired" ? "Token đã hết hạn" : "Token không hợp lệ",
    });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    next();
  };
};
