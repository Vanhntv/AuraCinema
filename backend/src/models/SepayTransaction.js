import mongoose from "mongoose";

const sepayTransactionSchema = new mongoose.Schema(
  {
    webhook_id: { type: Number, required: true, unique: true },
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
    processed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

sepayTransactionSchema.index({ reference_code: 1 });
sepayTransactionSchema.index({ transfer_type: 1, transfer_amount: 1 });

const SepayTransaction = mongoose.model("SepayTransaction", sepayTransactionSchema);

export default SepayTransaction;
