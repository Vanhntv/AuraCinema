import express from "express";
import {
  createCombo,
  deleteCombo,
  getAllCombos,
  getComboById,
  restoreCombo,
  updateCombo,
} from "../controllers/comboControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  asyncHandler,
  validateComboObjectId,
  validateCreateCombo,
  validateUpdateCombo,
} from "../middleware/comboMiddleware.js";
import { uploadComboImage } from "../middleware/comboUploadMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get(
  "/public",
  (req, res, next) => {
    req.query.status = "active";
    next();
  },
  asyncHandler(getAllCombos),
);

router.get("/", adminOnly, asyncHandler(getAllCombos));
router.get("/:id", adminOnly, validateComboObjectId, asyncHandler(getComboById));
router.post("/", adminOnly, uploadComboImage, validateCreateCombo, asyncHandler(createCombo));
router.put("/:id", adminOnly, validateComboObjectId, uploadComboImage, validateUpdateCombo, asyncHandler(updateCombo));
router.delete("/:id", adminOnly, validateComboObjectId, asyncHandler(deleteCombo));
router.patch("/:id/restore", adminOnly, validateComboObjectId, asyncHandler(restoreCombo));

export default router;
