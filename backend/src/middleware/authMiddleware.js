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
