import express from "express";
import { login, profile, register, updateProfile } from "../controllers/authControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, profile);
router.put("/profile", authMiddleware, updateProfile);
router.get("/admin/profile", authMiddleware, authorizeRoles("admin"), profile);

export default router;
