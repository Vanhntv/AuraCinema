import express from "express";
import { createTrailer, deleteTrailer, getAllTrailers, getTrailerById, updateTrailer } from "../controllers/trailersControllers.js";

const router = express.Router();

router.get("/", getAllTrailers);
router.get("/:id", getTrailerById);
router.post("/", createTrailer);
router.put("/:id", updateTrailer);
router.delete("/:id", deleteTrailer);

export default router;
