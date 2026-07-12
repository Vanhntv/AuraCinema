import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discount_type: {
      type: String,
      required: true,
      enum: ["percent", "fixed"],
      trim: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    min_order: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.start_date || value >= this.start_date;
        },
        message: "end_date must be greater than or equal to start_date",
      },
    },
    status: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "vouchers",
  }
);

voucherSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
    },
  }
);

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
