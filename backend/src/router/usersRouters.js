import express from "express";
import {
  adjustRewardPoints,
  forceResetPassword,
  getUserDetail,
  getUsers,
  updateUserBasicInfo,
  updateUserStatus,
} from "../controllers/usersControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", getUsers);
router.get("/:id", getUserDetail);
router.patch("/:id", updateUserBasicInfo);
router.patch("/:id/status", updateUserStatus);
router.post("/:id/reward-points", adjustRewardPoints);
router.post("/:id/force-reset-password", forceResetPassword);

export default router;
