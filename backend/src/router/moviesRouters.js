import express from "express";
import {
  createMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
} from "../controllers/moviesControllers.js";

const router = express.Router();

router.get("/", getAllMovies);
router.post("/", createMovie);
router.put("/:id", updateMovie);
router.get("/:id", getMovieById);

export default router;
