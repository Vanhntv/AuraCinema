import mongoose from "mongoose";

const sepayTransactionSchema = new mongoose.Schema(
  {
    reference_code: { type: String, required: true, unique: true, trim: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    booking_code: { type: String, default: "", trim: true, uppercase: true },
    gateway: { type: String, default: "", trim: true },
    transaction_date: { type: Date, default: null },
    account_number: { type: String, default: "", trim: true },
    sub_account: { type: String, default: "", trim: true },
    transfer_type: { type: String, default: "", trim: true },
    transfer_amount: { type: Number, default: 0, min: 0 },
    accumulated: { type: Number, default: 0, min: 0 },
    code: { type: String, default: "", trim: true },
    content: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    raw_payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["received", "processed", "ignored", "failed"],
      default: "received",
    },
    error_message: { type: String, default: "", trim: true },
    processed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const SepayTransaction = mongoose.model("SepayTransaction", sepayTransactionSchema);

export default SepayTransaction;
