import express from "express";
import {
  createAdminPolicy,
  deleteAdminPolicy,
  getAdminPolicies,
  getPublishedPolicies,
  importAdminPolicyFromWord,
  updateAdminPolicy,
} from "../controllers/policyControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadPolicyWordFile } from "../middleware/policyUploadMiddleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRoles("admin")];

router.get("/public", getPublishedPolicies);
router.get("/", adminOnly, getAdminPolicies);
router.post("/", adminOnly, createAdminPolicy);
router.post("/import-word", adminOnly, uploadPolicyWordFile, importAdminPolicyFromWord);
router.put("/:id", adminOnly, updateAdminPolicy);
router.delete("/:id", adminOnly, deleteAdminPolicy);

export default router;
