import mongoose from "mongoose";

const seatTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price_multiplier: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "seat_types",
  }
);

const SeatType = mongoose.model("SeatType", seatTypeSchema);

export default SeatType;
