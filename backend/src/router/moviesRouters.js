import express from "express";
import {
  createMovie,
  deleteMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
} from "../controllers/moviesControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/", getAllMovies);
router.post("/", adminOnly, createMovie);
router.put("/:id", adminOnly, updateMovie);
router.delete("/:id", adminOnly, deleteMovie);
router.get("/:id", getMovieById);

export default router;
