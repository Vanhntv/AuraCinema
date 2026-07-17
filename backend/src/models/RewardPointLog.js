import mongoose from "mongoose";

const rewardPointLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: ["add", "subtract", "earn", "redeem"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
    },
    balance_after: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "reward_point_logs",
  },
);

rewardPointLogSchema.index({ user_id: 1, created_at: -1 });

const RewardPointLog = mongoose.model("RewardPointLog", rewardPointLogSchema);

export default RewardPointLog;
