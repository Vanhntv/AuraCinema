import express from "express";
import { createRoom, deleteRoom, getAllRooms, getRoomById, getRoomsByCinema, updateRoom, updateRoomStatus } from "../controllers/roomsControllers.js";

const router = express.Router();

router.get("/", getAllRooms);
router.post("/", createRoom);
router.get("/cinema/:cinema_id", getRoomsByCinema);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.patch("/:id/status", updateRoomStatus);
router.delete("/:id", deleteRoom);

export default router;
