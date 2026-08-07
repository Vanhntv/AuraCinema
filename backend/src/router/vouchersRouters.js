import express from "express";
import {
  createVoucher,
  consumeVoucherQuantity,
  deleteVoucher,
  getAllVouchers,
  getPublicVoucherById,
  getPublicVouchers,
  getVoucherById,
  getVoucherStats,
  getVoucherUsageHistory,
  getMyVoucherWallet,
  verifyVoucher,
  toggleVoucherStatus,
  updateVoucher,
} from "../controllers/voucherControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];
const customerOnly = [authMiddleware, authorizeRoles("user")];

router.post("/verify", customerOnly, verifyVoucher);
router.get("/verify", customerOnly, verifyVoucher);
router.get("/my-wallet", customerOnly, getMyVoucherWallet);
router.get("/public", getPublicVouchers);
router.get("/public/:id", getPublicVoucherById);
router.get("/", adminOnly, getAllVouchers);
router.get("/stats", adminOnly, getVoucherStats);
router.get("/:id/usages", adminOnly, getVoucherUsageHistory);
router.get("/:id", adminOnly, getVoucherById);
router.post("/", adminOnly, createVoucher);
router.post("/:id/consume", adminOnly, consumeVoucherQuantity);
router.put("/:id", adminOnly, updateVoucher);
router.patch("/:id/status", adminOnly, toggleVoucherStatus);
router.delete("/:id", adminOnly, deleteVoucher);

export default router;
