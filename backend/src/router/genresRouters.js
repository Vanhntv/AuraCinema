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
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';

const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/", getAllGenres)
router.post("/", adminOnly, createGenres)
router.delete("/bulk", adminOnly, deleteManyGenres)
router.put("/:id", adminOnly, updateGenres )
router.patch("/:id/toggle-status", adminOnly, toggleGenreStatus)
router.delete("/:id", adminOnly, deleteGenres )

export default router
