import express from "express";
import { createCounterSale, getCounterShowtimes, printCounterSale } from "../controllers/staffPosControllers.js";
import { getStaffRooms, getStaffRoomSeats, updateStaffSeatStatus } from "../controllers/staffRoomsControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles("staff", "admin"));
router.get("/showtimes", getCounterShowtimes);
router.get("/rooms", getStaffRooms);
router.get("/rooms/:roomId/seats", getStaffRoomSeats);
router.patch("/rooms/:roomId/seats/:seatId/status", updateStaffSeatStatus);
router.post("/sales", createCounterSale);
router.post("/sales/:id/print", printCounterSale);

export default router;
