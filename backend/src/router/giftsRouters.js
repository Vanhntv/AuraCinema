import express from "express";
import {
  createGift,
  deleteGift,
  getAllGifts,
  getGiftById,
  toggleGiftStatus,
  updateGift,
  confirmAdminGiftGrant,
  getAdminGiftGrantHistory,
  getEligibleGifts,
  getGiftCatalog,
  getMyGiftQrController,
  getMyGiftWallet,
  previewAdminGiftGrant,
  redeemMyGift,
} from "../controllers/giftControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];
const userOnly = [authMiddleware, authorizeRoles("user")];

router.get("/catalog", userOnly, getGiftCatalog);
router.get("/my-wallet", userOnly, getMyGiftWallet);
router.get("/my-wallet/:id/qr", userOnly, getMyGiftQrController);
router.post("/eligible", userOnly, getEligibleGifts);
router.post("/:id/redeem", userOnly, redeemMyGift);
router.post("/admin/grants/preview", adminOnly, previewAdminGiftGrant);
router.post("/admin/grants/:id/confirm", adminOnly, confirmAdminGiftGrant);
router.get("/admin/grants", adminOnly, getAdminGiftGrantHistory);
router.get("/", adminOnly, getAllGifts);
router.get("/:id", adminOnly, getGiftById);
router.post("/", adminOnly, createGift);
router.put("/:id", adminOnly, updateGift);
router.patch("/:id/status", adminOnly, toggleGiftStatus);
router.delete("/:id", adminOnly, deleteGift);

export default router;
