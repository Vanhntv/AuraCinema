import express from "express";
import {
  createVoucher,
  consumeVoucherQuantity,
  deleteVoucher,
  getAllVouchers,
  getVoucherById,
  getVoucherUsageHistory,
  verifyVoucher,
  toggleVoucherStatus,
  updateVoucher,
} from "../controllers/voucherControllers.js";
import { authMiddleware, authorizeRoles, optionalAuthMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.post("/verify", optionalAuthMiddleware, verifyVoucher);
router.get("/verify", optionalAuthMiddleware, verifyVoucher);
router.get("/", adminOnly, getAllVouchers);
router.get("/:id/usages", adminOnly, getVoucherUsageHistory);
router.get("/:id", adminOnly, getVoucherById);
router.post("/", adminOnly, createVoucher);
router.post("/:id/consume", adminOnly, consumeVoucherQuantity);
router.put("/:id", adminOnly, updateVoucher);
router.patch("/:id/status", adminOnly, toggleVoucherStatus);
router.delete("/:id", adminOnly, deleteVoucher);

export default router;
