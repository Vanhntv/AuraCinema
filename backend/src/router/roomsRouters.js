import express from "express";
import { createRoom, getAllRooms, getRoomById, getRoomsByCinema, updateRoom } from "../controllers/roomsControllers.js";

const router = express.Router();

router.get("/", getAllRooms);
router.post("/", createRoom);
router.get("/cinema/:cinema_id", getRoomsByCinema);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);

export default router;
