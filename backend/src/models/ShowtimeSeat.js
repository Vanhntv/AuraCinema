import mongoose from "mongoose";

const showtimeSeatSchema = new mongoose.Schema(
  {
    showtime_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    seat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["available", "held", "reserved", "booked"],
      default: "available",
      trim: true,
    },
    held_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    hold_id: { type: mongoose.Schema.Types.ObjectId, ref: "SeatHold", default: null },
    reserved_by_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    hold_expires_at: { type: Date, default: null },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "showtime_seats",
  }
);

showtimeSeatSchema.index(
  { showtime_id: 1, seat_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
    },
  }
);

showtimeSeatSchema.index({ reserved_by_booking_id: 1 });
showtimeSeatSchema.index({ hold_id: 1 });

const ShowtimeSeat = mongoose.model("ShowtimeSeat", showtimeSeatSchema);

export default ShowtimeSeat;
