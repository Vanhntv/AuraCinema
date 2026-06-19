import express from "express";
import { createRoom, getAllRooms, getRoomById, getRoomsByCinema } from "../controllers/roomsControllers.js";

const router = express.Router();

router.get("/", getAllRooms);
router.post("/", createRoom);
router.get("/cinema/:cinema_id", getRoomsByCinema);
router.get("/:id", getRoomById);

export default router;
