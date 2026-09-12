import mongoose from "mongoose";

const rewardPointLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    event_key: { type: String },
    user_voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "UserVoucher", default: null },
    reconstructed: { type: Boolean, default: false },
    occurred_at: { type: Date, default: Date.now },
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
      default: null,
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
rewardPointLogSchema.index({ event_key: 1 }, { unique: true, sparse: true });
rewardPointLogSchema.index(
  { booking_id: 1, type: 1 },
  { unique: true, partialFilterExpression: { booking_id: { $exists: true }, type: "earn" } },
);

const RewardPointLog = mongoose.model("RewardPointLog", rewardPointLogSchema);

export default RewardPointLog;
