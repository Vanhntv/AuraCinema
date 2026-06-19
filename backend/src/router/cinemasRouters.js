import express from "express";
import { createCinema, getAllCinemas, updateCinema } from "../controllers/cinemasControllers.js";

const router = express.Router();

router.get("/", getAllCinemas);
router.post("/", createCinema);
router.put("/:id", updateCinema);

export default router;
