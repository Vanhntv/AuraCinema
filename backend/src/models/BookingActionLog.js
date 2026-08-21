import mongoose from "mongoose";

export const BOOKING_ACTIONS = ["LOOKUP", "PRINT_INITIAL", "REPRINT"];
export const BOOKING_ACTION_RESULTS = [
  "SUCCESS",
  "PARTIAL",
  "NO_ELIGIBLE_TICKETS",
  "INVALID_TOKEN",
  "BOOKING_NOT_PAYABLE",
  "ERROR",
];

const bookingActionLogSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    ticketIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, enum: BOOKING_ACTIONS, required: true },
    result: { type: String, enum: BOOKING_ACTION_RESULTS, required: true },
    reason: { type: String, default: "", trim: true, maxlength: 1000 },
    ipAddress: { type: String, default: "", trim: true, maxlength: 64 },
    userAgent: { type: String, default: "", trim: true, maxlength: 512 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: "booking_action_logs" },
);

bookingActionLogSchema.index({ bookingId: 1, createdAt: -1 });
bookingActionLogSchema.index({ adminId: 1, createdAt: -1 });
bookingActionLogSchema.index({ action: 1, createdAt: -1 });

const BookingActionLog = mongoose.model("BookingActionLog", bookingActionLogSchema);

export const createBookingActionLogSafe = async (payload = {}) => {
  try {
    return await BookingActionLog.create(payload);
  } catch (error) {
    console.warn("Khong the ghi log thao tac don ve:", error.message);
    return null;
  }
};

export default BookingActionLog;
