import express from "express";
import { createRoom, deleteRoom, ensureDefaultRooms, getAllRooms, getRoomById, getRoomsByCinema, updateRoom } from "../controllers/roomsControllers.js";

const router = express.Router();

router.get("/", getAllRooms);
router.post("/", createRoom);
router.post("/cinema/:cinema_id/defaults", ensureDefaultRooms);
router.get("/cinema/:cinema_id", getRoomsByCinema);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

export default router;
