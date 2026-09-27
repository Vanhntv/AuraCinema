import mongoose from "mongoose";

const accountChangeRequestSchema = new mongoose.Schema({
  target_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["profile", "status", "password_reset", "password_change", "reward_adjustment"], required: true },
  changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  before: { type: mongoose.Schema.Types.Mixed, default: {} },
  approvals: [{ admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, approved_at: { type: Date, required: true } }],
  status: { type: String, enum: ["pending", "approved", "applied", "rejected", "expired"], default: "pending", index: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  expires_at: { type: Date, required: true },
  applied_at: { type: Date, default: null },
  rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejected_at: { type: Date, default: null },
  rejection_reason: { type: String, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

accountChangeRequestSchema.index({ status: 1, expires_at: 1 });
accountChangeRequestSchema.index({ target_user_id: 1, status: 1 });
accountChangeRequestSchema.index(
  { target_user_id: 1, kind: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "approved"] } } },
);

export default mongoose.model("AccountChangeRequest", accountChangeRequestSchema);
