import express from "express";
import { createTrailer, deleteTrailer, getAllTrailers, updateTrailer } from "../controllers/trailersControllers.js";

const router = express.Router();

router.get("/", getAllTrailers);
router.post("/", createTrailer);
router.put("/:id", updateTrailer);
router.delete("/:id", deleteTrailer);

export default router;
