import express from 'express'
const router = express.Router();
import {
  createGenres,
  deleteGenres,
  deleteManyGenres,
  getAllGenres,
  toggleGenreStatus,
  updateGenres,
} from '../controllers/genresControllers.js';

router.get("/", getAllGenres)
router.post("/",createGenres)
router.delete("/bulk", deleteManyGenres)
router.patch("/:id/toggle-status", toggleGenreStatus)
router.put("/:id", updateGenres )
router.delete("/:id", deleteGenres )

export default router
