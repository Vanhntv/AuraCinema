import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    cinema_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cinema",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    room_type: {
      type: String,
      enum: ["2D", "3D"],
      default: "2D",
      trim: true,
    },
    row_count: {
      type: Number,
      default: null,
      min: 1,
    },
    column_count: {
      type: Number,
      default: null,
      min: 1,
    },
    capacity: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
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
  }
);

roomSchema.index(
  { cinema_id: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
    },
  },
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
