import express from "express";
import { createSeatType, getAllSeatTypes, getSeatTypeById, updateSeatType } from "../controllers/seatTypesControllers.js";

const router = express.Router();

router.get("/", getAllSeatTypes);
router.get("/:id", getSeatTypeById);
router.post("/", createSeatType);
router.put("/:id", updateSeatType);

export default router;
