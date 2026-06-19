import express from "express";
import { getAllTrailers } from "../controllers/trailersControllers.js";

const router = express.Router();

router.get("/", getAllTrailers);

export default router;
