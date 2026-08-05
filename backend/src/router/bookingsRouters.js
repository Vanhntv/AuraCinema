import express from "express";
import {
  cancelBooking,
  confirmBookingPayment,
  createBooking,
  getBookingPaymentStatus,
  getMyBookings,
} from "../controllers/bookingsControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/my", getMyBookings);
router.get("/:id/status", getBookingPaymentStatus);
router.post("/", createBooking);
router.post("/:id/pay", confirmBookingPayment);
router.patch("/:id/cancel", cancelBooking);
export default router;
