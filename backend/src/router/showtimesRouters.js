import express from "express";
import { getAllShowtimes } from "../controllers/showtimesControllers.js";

const router = express.Router();

router.get("/", getAllShowtimes);

export default router;
