import express from "express";
import { createSeatType, getAllSeatTypes, getSeatTypeById } from "../controllers/seatTypesControllers.js";

const router = express.Router();

router.get("/", getAllSeatTypes);
router.get("/:id", getSeatTypeById);
router.post("/", createSeatType);

export default router;
