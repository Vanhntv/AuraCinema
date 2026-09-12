import mongoose from "mongoose";

const schema = new mongoose.Schema({
  voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
  points_cost: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  active: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
schema.index({ voucher_id: 1 }, { unique: true });
export default mongoose.model("RewardOffer", schema);
