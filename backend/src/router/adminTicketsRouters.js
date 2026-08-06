import express from "express";
import {
  checkInAdminTicketQr,
  checkOutAdminTicketQr,
  getAdminTicketScanLogs,
  verifyAdminTicketQr,
} from "../controllers/adminTicketControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/scan-logs", getAdminTicketScanLogs);
router.post("/verify", verifyAdminTicketQr);
router.post("/check-in", checkInAdminTicketQr);
router.post("/check-out", checkOutAdminTicketQr);

export default router;
