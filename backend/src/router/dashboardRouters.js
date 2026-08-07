import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDashboardStats,
  getMonthlyRevenue,
  getTopMoviesRevenue,
  getTodayRevenue,
  getWeeklyRevenue,
} from "../controllers/dashboardControllers.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/stats", adminOnly, getDashboardStats);
router.get("/overview", adminOnly, getDashboardOverview);
router.get("/revenue/today", adminOnly, getTodayRevenue);
router.get("/revenue/daily", adminOnly, getDailyRevenue);
router.get("/revenue/weekly", adminOnly, getWeeklyRevenue);
router.get("/revenue/monthly", adminOnly, getMonthlyRevenue);
router.get("/movies/top-revenue", adminOnly, getTopMoviesRevenue);

export default router;
