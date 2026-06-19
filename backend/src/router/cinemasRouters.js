import express from "express";
import { createCinema, getAllCinemas } from "../controllers/cinemasControllers.js";

const router = express.Router();

router.get("/", getAllCinemas);
router.post("/", createCinema);

export default router;
