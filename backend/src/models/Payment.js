import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    payment_code: { type: String, required: true, trim: true, uppercase: true },
    provider: { type: String, required: true, trim: true, default: "vnpay" },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    transaction_ref: { type: String, required: true, trim: true },
    transaction_id: { type: String, default: "", trim: true },
    bank_code: { type: String, default: "", trim: true },
    response_code: { type: String, default: "", trim: true },
    transaction_status: { type: String, default: "", trim: true },
    order_info: { type: String, default: "", trim: true },
    payment_url: { type: String, default: "", trim: true },
    raw_request_data: { type: mongoose.Schema.Types.Mixed, default: null },
    raw_return_data: { type: mongoose.Schema.Types.Mixed, default: null },
    paid_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

paymentSchema.index({ booking_id: 1, provider: 1, status: 1 });
paymentSchema.index({ transaction_ref: 1, provider: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
