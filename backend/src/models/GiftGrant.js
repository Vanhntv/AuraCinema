import mongoose from "mongoose";

const giftGrantSchema = new mongoose.Schema({
  key: { type: String, required: true },
  gift_id: { type: mongoose.Schema.Types.ObjectId, ref: "Gift", required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  request: { type: String, required: true },
  completed_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "gift_grants",
});

giftGrantSchema.index({ key: 1, admin_id: 1 }, { unique: true });
giftGrantSchema.index({ completed_at: -1 });

export default mongoose.model("GiftGrant", giftGrantSchema);
