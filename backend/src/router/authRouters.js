import express from "express";
import {
  verifyEmail,
  resendVerification,
  changePassword,
  forgotPassword,
  login,
  loginRateLimit,
  profile,
  register,
  resetPassword,
  updateProfile,
} from "../controllers/authControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

import { createAuthEmailRateLimit } from "../middleware/authEmailRateLimit.js";
const router = express.Router();
const emailSendLimit = createAuthEmailRateLimit();
const emailVerifyLimit = createAuthEmailRateLimit({ max: 40 });

router.post("/register", emailSendLimit, register);
router.post("/verify-email", emailVerifyLimit, verifyEmail);
router.post("/resend-verification", emailSendLimit, resendVerification);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", emailSendLimit, forgotPassword);
router.post("/reset-password", emailVerifyLimit, resetPassword);
router.get("/profile", authMiddleware, profile);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/change-password", authMiddleware, changePassword);
router.get("/admin/profile", authMiddleware, authorizeRoles("admin"), profile);

export default router;
