import { verifyJwt } from "../utils/jwt.js";

export const authMiddleware = (req, res, next) => {
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

    req.user = {
      id: payload.id,
      role_id: payload.role_id,
      role: payload.role === "admin" || payload.role_id === 1 ? "admin" : "user",
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
