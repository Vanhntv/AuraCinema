import mongoose from "mongoose";

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
  user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  request: { type: String, required: true },
  completed_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
export default mongoose.model("VoucherGrant", schema);
