import mongoose from "mongoose";

const voucherUsageCounterSchema = new mongoose.Schema(
  {
    voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    used_count: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "voucher_usage_counters",
  },
);

voucherUsageCounterSchema.index({ voucher_id: 1, user_id: 1 }, { unique: true });

const VoucherUsageCounter = mongoose.model("VoucherUsageCounter", voucherUsageCounterSchema);

export default VoucherUsageCounter;
