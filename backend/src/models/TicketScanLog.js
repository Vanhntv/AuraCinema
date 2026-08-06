import mongoose from "mongoose";

export const TICKET_SCAN_ACTIONS = [
  "VERIFY",
  "CHECK_IN",
  "CHECK_OUT",
];

export const TICKET_SCAN_RESULTS = [
  "SUCCESS",
  "INVALID_TOKEN",
  "ALREADY_CHECKED_IN",
  "ALREADY_CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
  "WRONG_SHOWTIME",
  "PAYMENT_NOT_COMPLETED",
  "NOT_CHECKED_IN",
];

const ticketScanLogSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      enum: TICKET_SCAN_ACTIONS,
      required: true,
      trim: true,
    },
    result: {
      type: String,
      enum: TICKET_SCAN_RESULTS,
      required: true,
      trim: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 512,
    },
    errorNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "ticket_scan_logs",
  },
);

ticketScanLogSchema.index({ ticketId: 1, scannedAt: -1 });
ticketScanLogSchema.index({ adminId: 1, scannedAt: -1 });
ticketScanLogSchema.index({ scannedAt: -1 });
ticketScanLogSchema.index({ action: 1, result: 1, scannedAt: -1 });

const TicketScanLog = mongoose.model("TicketScanLog", ticketScanLogSchema);

export const createTicketScanLogSafe = async (payload = {}) => {
  try {
    return await TicketScanLog.create(payload);
  } catch (error) {
    console.warn("Khong the ghi log quet ve:", error.message);
    return null;
  }
};

export default TicketScanLog;
