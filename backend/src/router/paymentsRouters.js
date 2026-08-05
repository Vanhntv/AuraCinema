import express from "express";
import {
  createSepayPgCheckout,
  createVnpayPaymentUrl,
  verifySepayPgReturn,
  verifyVnpayReturn,
} from "../controllers/paymentsControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/vnpay/create-payment-url", authMiddleware, createVnpayPaymentUrl);
router.get("/vnpay/return", verifyVnpayReturn);
router.post("/sepay-pg/create-checkout", authMiddleware, createSepayPgCheckout);
router.get("/sepay-pg/return", verifySepayPgReturn);

export default router;
