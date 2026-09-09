import express from "express";
import { createCounterSale, getCounterShowtimes, printCounterSale } from "../controllers/staffPosControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles("staff", "admin"));
router.get("/showtimes", getCounterShowtimes);
router.post("/sales", createCounterSale);
router.post("/sales/:id/print", printCounterSale);

export default router;
