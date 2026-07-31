import express from "express";
import {
  cancelAdminBooking,
  getAdminBookingById,
  getAdminBookings,
  updateAdminBookingPayment,
} from "../controllers/adminBookingsControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", getAdminBookings);
router.get("/:id", getAdminBookingById);
router.patch("/:id/payment", updateAdminBookingPayment);
router.patch("/:id/cancel", cancelAdminBooking);

export default router;
