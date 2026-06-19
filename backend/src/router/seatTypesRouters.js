import express from "express";
import { getAllSeatTypes } from "../controllers/seatTypesControllers.js";

const router = express.Router();

router.get("/", getAllSeatTypes);

export default router;
