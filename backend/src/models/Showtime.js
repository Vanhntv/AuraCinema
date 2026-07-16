import mongoose from "mongoose";

const showtimeSchema = new mongoose.Schema(
  {
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    start_time: {
      type: Date,
      required: true,
    },
    end_time: {
      type: Date,
      required: true,
    },
    base_price: {
      type: Number,
      default: null,
    },
    seat_prices: {
      normal: { type: Number, default: null, min: 0 },
      vip: { type: Number, default: null, min: 0 },
      couple: { type: Number, default: null, min: 0 },
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
  }
);

const Showtime = mongoose.model("Showtime", showtimeSchema);

export default Showtime;
