import mongoose from "mongoose";

const seatHoldSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, trim: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
    showtime_seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowtimeSeat" }],
    status: {
      type: String,
      enum: ["active", "converted", "released", "expired"],
      default: "active",
    },
    expires_at: { type: Date, required: true },
    converted_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    released_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

seatHoldSchema.index(
  { user_id: 1, showtime_id: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);
seatHoldSchema.index({ status: 1, expires_at: 1 });

const SeatHold = mongoose.model("SeatHold", seatHoldSchema);

export default SeatHold;
