import express from "express";
import { createTrailer, getAllTrailers } from "../controllers/trailersControllers.js";

const router = express.Router();

router.get("/", getAllTrailers);
router.post("/", createTrailer);

export default router;
