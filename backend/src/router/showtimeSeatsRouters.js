import express from "express";
import {
  createShowtimeSeat,
  deleteShowtimeSeat,
  getAllShowtimeSeats,
  getShowtimeSeatById,
  updateShowtimeSeat,
  holdShowtimeSeats,
  releaseShowtimeSeats,
  getActiveShowtimeSeatHold,
} from "../controllers/showtimeSeatsControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllShowtimeSeats);
router.get("/hold/active", authMiddleware, getActiveShowtimeSeatHold);
router.post("/hold", authMiddleware, holdShowtimeSeats);
router.post("/release", authMiddleware, releaseShowtimeSeats);
router.get("/:id", getShowtimeSeatById);
router.post("/", createShowtimeSeat);
router.put("/:id", updateShowtimeSeat);
router.delete("/:id", deleteShowtimeSeat);

export default router;
