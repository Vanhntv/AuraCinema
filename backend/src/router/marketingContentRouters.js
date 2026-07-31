import express from "express";
import {
  getPublicMarketingContentBySlug,
  listPublicMarketingContent,
} from "../controllers/marketingContentControllers.js";

const router = express.Router();

router.get("/", listPublicMarketingContent);
router.get("/:type/:slug", getPublicMarketingContentBySlug);

export default router;
