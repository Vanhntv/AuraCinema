import express from "express";
import {
  createMovie,
  deleteMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
} from "../controllers/moviesControllers.js";

const router = express.Router();

router.get("/", getAllMovies);
router.post("/", createMovie);
router.put("/:id", updateMovie);
router.delete("/:id", deleteMovie);
router.get("/:id", getMovieById);

export default router;
