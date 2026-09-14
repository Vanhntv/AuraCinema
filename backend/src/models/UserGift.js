import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const userGiftSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  gift_id: { type: mongoose.Schema.Types.ObjectId, ref: "Gift", required: true, index: true },
  code: { type: String, default: () => `AG${randomBytes(10).toString("hex").toUpperCase()}` },
  source: { type: String, enum: ["automatic", "points", "manual", "migration"], required: true },
  issue_key: { type: String, required: true },
  issue_slot: { type: Number, required: true, min: 1 },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  status: {
    type: String,
    enum: ["available", "reserved", "used", "fulfilled", "expired"],
    default: "available",
    index: true,
  },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  linked_user_voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "UserVoucher", default: null },
  reward_point_log_id: { type: mongoose.Schema.Types.ObjectId, ref: "RewardPointLog", default: null },
  issued_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  redeemed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  expires_at: { type: Date, required: true, index: true },
  reserved_at: { type: Date, default: null },
  used_at: { type: Date, default: null },
  qr_token_hash: { type: String, default: "", select: false },
  qr_token_encrypted: { type: String, default: "", select: false },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "user_gifts",
});

userGiftSchema.index({ code: 1 }, { unique: true });
userGiftSchema.index({ issue_key: 1 }, { unique: true });
userGiftSchema.index({ gift_id: 1, user_id: 1, issue_slot: 1 }, { unique: true });
userGiftSchema.index({ user_id: 1, status: 1, expires_at: -1 });
userGiftSchema.index(
  { qr_token_hash: 1 },
  { unique: true, partialFilterExpression: { qr_token_hash: { $type: "string", $gt: "" } } },
);

export default mongoose.model("UserGift", userGiftSchema);
