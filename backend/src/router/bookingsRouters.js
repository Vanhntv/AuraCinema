import express from "express";
import { availability, createBooking, getBookings, updateBooking } from "../controllers/bookingsControllers.js";
const router = express.Router();
router.get("/availability/:showtime_id", availability);
router.get("/", getBookings);
router.post("/", createBooking);
router.put("/:id", updateBooking);
export default router;
