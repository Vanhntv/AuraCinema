import express from "express";
import {
  forgotPassword,
  login,
  loginRateLimit,
  profile,
  register,
  resetPassword,
} from "../controllers/authControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", authMiddleware, profile);
router.get("/admin/profile", authMiddleware, authorizeRoles("admin"), profile);

export default router;
