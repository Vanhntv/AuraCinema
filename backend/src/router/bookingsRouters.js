import express from "express";
import { createBooking, getMyBookings } from "../controllers/bookingsControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/my", getMyBookings);
router.post("/", createBooking);
export default router;
