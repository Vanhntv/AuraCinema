import express from "express";
import {
  createVnpayPaymentUrl,
  verifyVnpayReturn,
} from "../controllers/paymentsControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/vnpay/create-payment-url", authMiddleware, createVnpayPaymentUrl);
router.get("/vnpay/return", verifyVnpayReturn);

export default router;
