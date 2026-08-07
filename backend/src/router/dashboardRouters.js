import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getDashboardOverview,
  getDashboardStats,
  getTodayRevenue,
} from "../controllers/dashboardControllers.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/stats", adminOnly, getDashboardStats);
router.get("/overview", adminOnly, getDashboardOverview);
router.get("/revenue/today", adminOnly, getTodayRevenue);

export default router;
