import express from "express";
import { receiveSepayWebhook } from "../controllers/sepayWebhookControllers.js";

const router = express.Router();

router.post("/sepay", receiveSepayWebhook);

export default router;
