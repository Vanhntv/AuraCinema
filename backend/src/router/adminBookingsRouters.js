import express from "express";
import {
  cancelAdminBooking,
  getAdminBookingById,
  getAdminBookings,
  updateAdminBookingPayment,
} from "../controllers/adminBookingsControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  lookupAdminBookingOrder,
  lookupAdminBookingOrderPrint,
  reprintBookingTickets,
  scanPrintBookingOrder,
} from "../controllers/adminBookingPrintControllers.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", getAdminBookings);
router.post("/lookup", lookupAdminBookingOrder);
router.post("/lookup-print", lookupAdminBookingOrderPrint);
router.post("/scan-print", scanPrintBookingOrder);
router.post("/:id/reprint", reprintBookingTickets);
router.get("/:id", getAdminBookingById);
router.patch("/:id/payment", updateAdminBookingPayment);
router.patch("/:id/cancel", cancelAdminBooking);

export default router;
