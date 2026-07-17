import mongoose from "mongoose";

const userVoucherSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    voucher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "used", "expired"],
      default: "available",
    },
    used_at: {
      type: Date,
      default: null,
    },
    expires_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "user_vouchers",
  },
);

userVoucherSchema.index({ user_id: 1, status: 1 });
userVoucherSchema.index({ user_id: 1, voucher_id: 1 });

const UserVoucher = mongoose.model("UserVoucher", userVoucherSchema);

export default UserVoucher;
