import mongoose from "mongoose";

const giftSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image_url: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["ticket", "combo", "voucher", "point", "physical"],
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    value_label: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    issued_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    remaining_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    condition: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
          return !this.start_date || value > this.start_date;
        },
        message: "end_date must be greater than start_date",
      },
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "cancelled"],
      default: "draft",
      trim: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "gifts",
  },
);

giftSchema.pre("validate", function syncRemainingQuantity(next) {
  const quantity = Number(this.quantity || 0);
  const issuedQuantity = Number(this.issued_quantity || 0);
  this.remaining_quantity = Math.max(quantity - issuedQuantity, 0);
  next();
});

giftSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
    },
  },
);
giftSchema.index({ type: 1, status: 1, deleted_at: 1 });
giftSchema.index({ start_date: 1, end_date: 1 });

const Gift = mongoose.model("Gift", giftSchema);

export default Gift;
