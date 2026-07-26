import express from "express";
import {
  createCombo,
  deleteCombo,
  getAllCombos,
  getComboById,
  restoreCombo,
  updateCombo,
} from "../controllers/comboControllers.js";
import {
  asyncHandler,
  validateComboObjectId,
  validateCreateCombo,
  validateUpdateCombo,
} from "../middleware/comboMiddleware.js";
import { uploadComboImage } from "../middleware/comboUploadMiddleware.js";

const router = express.Router();

router.get("/", asyncHandler(getAllCombos));
router.get("/:id", validateComboObjectId, asyncHandler(getComboById));
router.post("/", uploadComboImage, validateCreateCombo, asyncHandler(createCombo));
router.put("/:id", validateComboObjectId, uploadComboImage, validateUpdateCombo, asyncHandler(updateCombo));
router.delete("/:id", validateComboObjectId, asyncHandler(deleteCombo));
router.patch("/:id/restore", validateComboObjectId, asyncHandler(restoreCombo));

export default router;
