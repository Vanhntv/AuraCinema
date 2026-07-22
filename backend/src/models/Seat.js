import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    seat_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeatType",
      required: true,
    },
    seat_row: {
      type: String,
      required: true,
      trim: true,
    },
    seat_number: {
      type: Number,
      required: true,
    },
    seat_code: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
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
    collection: "seats",
  }
);

seatSchema.index(
  { room_id: 1, seat_row: 1, seat_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
    },
  }
);

const Seat = mongoose.model("Seat", seatSchema);

export default Seat;
