import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

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
    code: { type: String, default: () => `AW${randomBytes(10).toString("hex").toUpperCase()}` },
    source: { type: String, enum: ["admin", "redeem", "gift", "legacy"], default: "legacy" },
    requires_review: { type: Boolean, default: false },
    issue_key: { type: String },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["available", "reserved", "used", "expired"],
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
userVoucherSchema.index({ code: 1 }, { unique: true, sparse: true });
userVoucherSchema.index({ issue_key: 1 }, { unique: true, sparse: true });

const UserVoucher = mongoose.model("UserVoucher", userVoucherSchema);

export default UserVoucher;
