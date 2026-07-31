import mongoose from "mongoose";

const marketingContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["news", "promotion"],
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true },
    content_html: { type: String, required: true, trim: true },
    author: { type: String, default: "AuraCinema", trim: true },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    published_at: { type: Date, default: null },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    linked_voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    view_count: { type: Number, default: 0, min: 0 },
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

marketingContentSchema.index({ type: 1, slug: 1 }, {
  unique: true,
  partialFilterExpression: { deleted_at: null },
});

const MarketingContent = mongoose.model("MarketingContent", marketingContentSchema);

export default MarketingContent;
