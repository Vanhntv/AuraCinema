import express from 'express'
const router = express.Router();
import { createGenres, deleteGenres, getAllGenres, updateGenres } from '../controllers/genresControllers.js';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';

const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/", getAllGenres)
router.post("/", adminOnly, createGenres)
router.put("/:id", adminOnly, updateGenres )
router.delete("/:id", adminOnly, deleteGenres )

export default router
