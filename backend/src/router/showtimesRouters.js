import express from "express";
import {
  checkShowtimeConflict,
  getAllShowtimes,
  createShowtime,
  deleteShowtime,
  getShowtimeById,
  getShowtimesByMovie,
  getShowtimesByRoom,
  previewShowtimePricing,
  updateShowtime,
} from "../controllers/showtimesControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/check-conflict", adminOnly, checkShowtimeConflict);
router.post("/pricing-preview", adminOnly, previewShowtimePricing);
router.get("/movie/:movie_id", getShowtimesByMovie);
router.get("/room/:room_id", getShowtimesByRoom);
router.put("/:id", adminOnly, updateShowtime);
router.delete("/:id", adminOnly, deleteShowtime);
router.get("/:id", getShowtimeById);
router.get("/", getAllShowtimes);
router.post("/", adminOnly, createShowtime);

export default router;
