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
      default: "available",
      trim: true,
    },
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

const ShowtimeSeat = mongoose.model("ShowtimeSeat", showtimeSeatSchema);

export default ShowtimeSeat;
