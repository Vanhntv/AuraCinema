import express from "express";
import {
  getMyTicketDetail,
  getMyTicketQr,
  getMyTickets,
  getMyTicketsByBooking,
} from "../controllers/ticketControllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/my-tickets", getMyTickets);
router.get("/by-booking/:bookingId", getMyTicketsByBooking);
router.get("/:ticketId", getMyTicketDetail);
router.get("/:ticketId/qr", getMyTicketQr);

export default router;
