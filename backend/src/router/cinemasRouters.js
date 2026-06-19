import express from "express";
import { getAllCinemas } from "../controllers/cinemasControllers.js";

const router = express.Router();

router.get("/", getAllCinemas);

export default router;
