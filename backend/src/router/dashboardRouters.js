import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getBookingStatusStats,
  getDailyRevenue,
  getDashboardOverview,
  getDashboardStats,
  getMonthlyRevenue,
  getRangeRevenue,
  getMovieRevenue,
  getRevenueComparison,
  getTopSellingCombos,
  getTopMoviesRevenue,
  getTodayRevenue,
  getWeeklyRevenue,
  getYearlyRevenue,
} from "../controllers/dashboardControllers.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/stats", adminOnly, getDashboardStats);
router.get("/overview", adminOnly, getDashboardOverview);
router.get("/bookings/statuses", adminOnly, getBookingStatusStats);
router.get("/revenue/today", adminOnly, getTodayRevenue);
router.get("/revenue/daily", adminOnly, getDailyRevenue);
router.get("/revenue/weekly", adminOnly, getWeeklyRevenue);
router.get("/revenue/monthly", adminOnly, getMonthlyRevenue);
router.get("/revenue/yearly", adminOnly, getYearlyRevenue);
router.get("/revenue/range", adminOnly, getRangeRevenue);
router.get("/revenue/comparison", adminOnly, getRevenueComparison);
router.get("/movies/top-revenue", adminOnly, getTopMoviesRevenue);
router.get("/combos/top-selling", adminOnly, getTopSellingCombos);
router.get("/movies/:movieId", adminOnly, getMovieRevenue);

export default router;
