import express from "express";
import {
  getHomeBannerSettings,
  updateHomeBannerSettings,
} from "../controllers/settingsControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/home-banner", getHomeBannerSettings);
router.put("/home-banner", adminOnly, updateHomeBannerSettings);

export default router;
