import express from 'express'
const router = express.Router();
import { createGenres, deleteGenres, getAllGenres, updateGenres } from '../controllers/genresControllers.js';

router.get("/", getAllGenres)
router.post("/",createGenres)
router.put("/:id", updateGenres )
router.delete("/:id", deleteGenres )

export default router