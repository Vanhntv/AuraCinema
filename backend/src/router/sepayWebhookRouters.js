import express from "express";
import { receiveSepayWebhook } from "../controllers/sepayWebhookControllers.js";

const router = express.Router();

router.post("/webhook", receiveSepayWebhook);

export default router;
