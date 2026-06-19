import express from "express";
import { getAllShowtimes, getShowtimeById } from "../controllers/showtimesControllers.js";

const router = express.Router();

router.get("/:id", getShowtimeById);
router.get("/", getAllShowtimes);

export default router;
