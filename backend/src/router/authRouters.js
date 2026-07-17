import express from "express";
import {
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

const router = express.Router();

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", authMiddleware, profile);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/change-password", authMiddleware, changePassword);
router.get("/admin/profile", authMiddleware, authorizeRoles("admin"), profile);

export default router;
