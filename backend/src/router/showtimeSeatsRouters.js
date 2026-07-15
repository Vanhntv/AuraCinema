import express from "express";
import {
  createShowtimeSeat,
  deleteShowtimeSeat,
  getAllShowtimeSeats,
  getShowtimeSeatById,
  updateShowtimeSeat,
} from "../controllers/showtimeSeatsControllers.js";

const router = express.Router();

router.get("/", getAllShowtimeSeats);
router.get("/:id", getShowtimeSeatById);
router.post("/", createShowtimeSeat);
router.put("/:id", updateShowtimeSeat);
router.delete("/:id", deleteShowtimeSeat);

export default router;
