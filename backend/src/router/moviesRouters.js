import express from "express";
import {
  createMovie,
  getAllMovies,
  getMovieById,
} from "../controllers/moviesControllers.js";

const router = express.Router();

router.get("/", getAllMovies);
router.post("/", createMovie);
router.get("/:id", getMovieById);

export default router;
