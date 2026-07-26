import express from "express";
import { createGift, getAllGifts, getGiftById } from "../controllers/giftControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/", adminOnly, getAllGifts);
router.get("/:id", adminOnly, getGiftById);
router.post("/", adminOnly, createGift);

export default router;
