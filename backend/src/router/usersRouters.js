import express from "express";
import {
  adjustRewardPoints,
  forceResetPassword,
  getAccountChangeRequests,
  approveAccountChangeRequest,
  rejectAccountChangeRequest,
  resendApprovedPasswordReset,
  getUserDetail,
  getUsers,
  updateUserBasicInfo,
  updateUserStatus,
} from "../controllers/usersControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const approvalAttempts = new Map();
const approvalRateLimit = (req, res, next) => {
  const key = req.user.id;
  const now = Date.now();
  const current = approvalAttempts.get(key);
  const entry = current && now - current.startedAt < 15 * 60 * 1000
    ? current
    : { count: 0, startedAt: now };
  if (entry.count >= 20) return res.status(429).json({ success: false, message: "Đã thử xác nhận quá nhiều lần. Vui lòng thử lại sau." });
  entry.count += 1;
  approvalAttempts.set(key, entry);
  next();
};

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", getUsers);
router.get("/approval-requests", getAccountChangeRequests);
router.post("/approval-requests/:id/approve", approvalRateLimit, approveAccountChangeRequest);
router.post("/approval-requests/:id/reject", rejectAccountChangeRequest);
router.post("/approval-requests/:id/send-reset", resendApprovedPasswordReset);
router.get("/:id", getUserDetail);
router.patch("/:id", updateUserBasicInfo);
router.patch("/:id/status", updateUserStatus);
router.post("/:id/reward-points", adjustRewardPoints);
router.post("/:id/force-reset-password", forceResetPassword);

export default router;
