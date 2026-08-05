import mongoose from "mongoose";

const sepayTransactionSchema = new mongoose.Schema(
  {
    transaction_key: { type: String, required: true, unique: true, trim: true },
    webhook_id: { type: String, required: true, unique: true, trim: true },
    sepay_api_id: { type: String, default: "", trim: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    gateway: { type: String, default: "", trim: true },
    transaction_date: { type: String, default: "", trim: true },
    account_number: { type: String, default: "", trim: true },
    sub_account: { type: String, default: "", trim: true },
    code: { type: String, default: "", trim: true },
    content: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    transfer_type: { type: String, default: "", trim: true },
    transfer_amount: { type: Number, default: 0 },
    accumulated: { type: Number, default: 0 },
    reference_code: { type: String, default: "", trim: true },
    raw_payload: { type: mongoose.Schema.Types.Mixed, required: true },
    processing_status: {
      type: String,
      enum: ["received", "paid", "ignored", "failed"],
      default: "received",
    },
    error_message: { type: String, default: "", trim: true },
    processed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

sepayTransactionSchema.index({ reference_code: 1 });
sepayTransactionSchema.index({ booking_id: 1 });
sepayTransactionSchema.index({ transfer_type: 1, transfer_amount: 1 });

const SepayTransaction = mongoose.model("SepayTransaction", sepayTransactionSchema);

export default SepayTransaction;
