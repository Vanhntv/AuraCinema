import express from "express";
import { createSeatType, getAllSeatTypes } from "../controllers/seatTypesControllers.js";

const router = express.Router();

router.get("/", getAllSeatTypes);
router.post("/", createSeatType);

export default router;
