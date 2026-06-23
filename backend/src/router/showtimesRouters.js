import express from "express";
import {
  getAllShowtimes,
  createShowtime,
  getShowtimeById,
  getShowtimesByMovie,
  getShowtimesByRoom,
} from "../controllers/showtimesControllers.js";

const router = express.Router();

router.get("/movie/:movie_id", getShowtimesByMovie);
router.get("/room/:room_id", getShowtimesByRoom);
router.get("/:id", getShowtimeById);
router.get("/", getAllShowtimes);
router.post("/", createShowtime);

export default router;
