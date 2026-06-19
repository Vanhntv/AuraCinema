import express from "express";
import { createCinema, deleteCinema, getAllCinemas, getCinemaById, updateCinema } from "../controllers/cinemasControllers.js";

const router = express.Router();

router.get("/", getAllCinemas);
router.get("/:id", getCinemaById);
router.post("/", createCinema);
router.put("/:id", updateCinema);
router.delete("/:id", deleteCinema);

export default router;
