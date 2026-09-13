import express from "express";
import { createCounterSale, getCounterShowtimes, getShiftReport, lookupStaffBookingOrder, printCounterSale } from "../controllers/staffPosControllers.js";
import { getStaffRooms, getStaffRoomSeats, updateStaffSeatStatus } from "../controllers/staffRoomsControllers.js";
import { addStaffTransactionNote, getStaffTransactionById, getStaffTransactions } from "../controllers/staffTransactionControllers.js";
import { checkInAdminTicketQr, lookupAdminTicketCode, verifyAdminTicketQr } from "../controllers/adminTicketControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { createRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
const ticketScanRateLimit = createRateLimitMiddleware({
  windowMs: process.env.TICKET_QR_RATE_LIMIT_WINDOW_MS,
  maxRequests: process.env.TICKET_QR_RATE_LIMIT_MAX,
  keyPrefix: "staff-ticket-qr",
  message: "Bạn quét vé quá nhanh. Vui lòng thử lại sau.",
});
router.use(authMiddleware, authorizeRoles("staff", "admin"));
router.get("/showtimes", getCounterShowtimes);
router.get("/shift-report", getShiftReport);
router.get("/transactions", getStaffTransactions);
router.get("/transactions/:id", getStaffTransactionById);
router.post("/transactions/:id/notes", addStaffTransactionNote);
router.post("/tickets/lookup", ticketScanRateLimit, lookupAdminTicketCode);
router.post("/tickets/verify", ticketScanRateLimit, verifyAdminTicketQr);
router.post("/tickets/check-in", ticketScanRateLimit, checkInAdminTicketQr);
router.post("/bookings/verify", ticketScanRateLimit, lookupStaffBookingOrder);
router.get("/rooms", getStaffRooms);
router.get("/rooms/:roomId/seats", getStaffRoomSeats);
router.patch("/rooms/:roomId/seats/:seatId/status", updateStaffSeatStatus);
router.post("/sales", createCounterSale);
router.post("/sales/:id/print", printCounterSale);

export default router;
