import express from "express";
import {
  createCombo,
  deleteCombo,
  getAllCombos,
  getComboById,
  restoreCombo,
  updateCombo,
} from "../controllers/comboControllers.js";

const router = express.Router();

router.get("/", getAllCombos);
router.get("/:id", getComboById);
router.post("/", createCombo);
router.put("/:id", updateCombo);
router.delete("/:id", deleteCombo);
router.patch("/:id/restore", restoreCombo);

export default router;
