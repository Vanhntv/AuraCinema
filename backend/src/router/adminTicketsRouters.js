import express from "express";
import {
  checkInAdminTicketQr,
  getAdminTicketScanLogs,
  verifyAdminTicketQr,
} from "../controllers/adminTicketControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { createRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
const qrActionRateLimit = createRateLimitMiddleware({
  windowMs: process.env.TICKET_QR_RATE_LIMIT_WINDOW_MS,
  maxRequests: process.env.TICKET_QR_RATE_LIMIT_MAX,
  keyPrefix: "admin-ticket-qr",
  message: "Bạn quét vé quá nhanh. Vui lòng thử lại sau.",
});

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/scan-logs", getAdminTicketScanLogs);
router.post("/verify", qrActionRateLimit, verifyAdminTicketQr);
router.post("/check-in", qrActionRateLimit, checkInAdminTicketQr);

export default router;
