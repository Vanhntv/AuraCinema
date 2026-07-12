import express from "express";
import {
  getAllShowtimes,
  createShowtime,
  deleteShowtime,
  getShowtimeById,
  getShowtimesByMovie,
  getShowtimesByRoom,
  updateShowtime,
} from "../controllers/showtimesControllers.js";

const router = express.Router();

router.get("/movie/:movie_id", getShowtimesByMovie);
router.get("/room/:room_id", getShowtimesByRoom);
router.put("/:id", updateShowtime);
router.delete("/:id", deleteShowtime);
router.get("/:id", getShowtimeById);
router.get("/", getAllShowtimes);
router.post("/", createShowtime);

export default router;
