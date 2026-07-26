import express from "express";
import { cancelBooking, createBooking, getMyBookings } from "../controllers/bookingsControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);
router.use(authorizeRoles("user"));
router.get("/my", getMyBookings);
router.post("/", createBooking);
router.patch("/:id/cancel", cancelBooking);
export default router;
