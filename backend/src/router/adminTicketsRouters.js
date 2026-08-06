import express from "express";
import {
  checkInAdminTicketQr,
  verifyAdminTicketQr,
} from "../controllers/adminTicketControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.post("/verify", verifyAdminTicketQr);
router.post("/check-in", checkInAdminTicketQr);

export default router;
