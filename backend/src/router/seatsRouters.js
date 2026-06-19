import express from "express";
import {
  createSeat,
  deleteSeat,
  getAllSeats,
  getSeatById,
  getSeatsByRoom,
  updateSeat,
} from "../controllers/seatsControllers.js";

const router = express.Router();

router.get("/", getAllSeats);
router.get("/room", getSeatsByRoom);
router.get("/room/:room_id", getSeatsByRoom);
router.get("/:id", getSeatById);
router.post("/", createSeat);
router.put("/:id", updateSeat);
router.delete("/:id", deleteSeat);

export default router;
