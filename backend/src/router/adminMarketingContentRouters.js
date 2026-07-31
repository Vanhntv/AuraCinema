import express from "express";
import {
  createAdminMarketingContent,
  deleteAdminMarketingContent,
  listAdminMarketingContent,
  updateAdminMarketingContent,
} from "../controllers/marketingContentControllers.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", listAdminMarketingContent);
router.post("/", createAdminMarketingContent);
router.put("/:id", updateAdminMarketingContent);
router.delete("/:id", deleteAdminMarketingContent);

export default router;
