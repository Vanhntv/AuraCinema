import express from "express";
import { createSeatType, deleteSeatType, getAllSeatTypes, getSeatTypeById, updateSeatType } from "../controllers/seatTypesControllers.js";

const router = express.Router();

router.get("/", getAllSeatTypes);
router.get("/:id", getSeatTypeById);
router.post("/", createSeatType);
router.put("/:id", updateSeatType);
router.delete("/:id", deleteSeatType);

export default router;
