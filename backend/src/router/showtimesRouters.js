import express from "express";
import {
  getAllShowtimes,
  getShowtimeById,
  getShowtimesByMovie,
} from "../controllers/showtimesControllers.js";

const router = express.Router();

router.get("/movie/:movie_id", getShowtimesByMovie);
router.get("/:id", getShowtimeById);
router.get("/", getAllShowtimes);

export default router;
