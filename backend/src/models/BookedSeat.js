import mongoose from "mongoose";

const bookedSeatSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
  seat_id: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

bookedSeatSchema.index({ showtime_id: 1, seat_id: 1 }, { unique: true });

export default mongoose.model("BookedSeat", bookedSeatSchema);
