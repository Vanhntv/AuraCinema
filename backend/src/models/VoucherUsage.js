import mongoose from "mongoose";

const voucherUsageSchema = new mongoose.Schema(
  {
    voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    discount_type: { type: String, enum: ["percent", "fixed"], required: true },
    discount_value: { type: Number, required: true, min: 0 },
    apply_scope: { type: String, required: true, trim: true },
    subtotal_price: { type: Number, required: true, min: 0 },
    eligible_amount: { type: Number, required: true, min: 0 },
    discount_amount: { type: Number, required: true, min: 0 },
    final_price: { type: Number, required: true, min: 0 },
    payment_status: {
      type: String,
      enum: ["paid", "refunded"],
      default: "paid",
    },
    used_at: { type: Date, default: Date.now },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "voucher_usages",
  },
);

voucherUsageSchema.index({ voucher_id: 1, user_id: 1, used_at: -1 });
voucherUsageSchema.index({ booking_id: 1 }, { unique: true });

const VoucherUsage = mongoose.model("VoucherUsage", voucherUsageSchema);

export default VoucherUsage;
