import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100000,
    },
    surface: {
      type: String,
      enum: ["payment", "terms", "privacy", "booking", "general"],
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    requires_confirmation: {
      type: Boolean,
      default: false,
    },
    display_order: {
      type: Number,
      default: 0,
      min: 0,
    },
    source_type: {
      type: String,
      enum: ["manual", "file", "word"],
      default: "manual",
    },
    source_file_name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },
    published_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

policySchema.index({ surface: 1, status: 1, display_order: 1, created_at: -1 });

const Policy = mongoose.model("Policy", policySchema);

export default Policy;
