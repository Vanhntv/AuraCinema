import express from "express";
import { getAllRooms, getRoomById, getRoomsByCinema } from "../controllers/roomsControllers.js";

const router = express.Router();

router.get("/", getAllRooms);
router.get("/cinema/:cinema_id", getRoomsByCinema);
router.get("/:id", getRoomById);

export default router;
