import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
    showtime_seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowtimeSeat", required: true }],
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, required: true, trim: true, lowercase: true },
    customer_phone: { type: String, default: null, trim: true },
    total_price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
