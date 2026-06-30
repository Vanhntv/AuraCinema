import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  booking_code: { type: String, required: true, unique: true },
  showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
  seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true }],
  seats: [{ seat_id: mongoose.Schema.Types.ObjectId, label: String, price: Number }],
  customer_name: { type: String, required: true, trim: true },
  customer_phone: { type: String, required: true, trim: true },
  total_price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  payment_status: { type: String, enum: ["pending", "paid"], default: "pending" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export default mongoose.model("Booking", bookingSchema);
