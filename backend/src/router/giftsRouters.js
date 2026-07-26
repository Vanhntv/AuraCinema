import express from "express";
import { getAllGifts } from "../controllers/giftControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/", adminOnly, getAllGifts);

export default router;
