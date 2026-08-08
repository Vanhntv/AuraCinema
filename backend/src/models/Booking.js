import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    booking_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
    showtime_seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowtimeSeat", required: true }],
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, required: true, trim: true, lowercase: true },
    customer_phone: { type: String, default: null, trim: true },
    combos: [
      {
        combo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Combo", required: true },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true, min: 0 },
      },
    ],
    voucher: {
      voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
      code: { type: String, default: "", trim: true },
      discount_type: { type: String, enum: ["percent", "fixed", ""], default: "" },
      discount_value: { type: Number, default: 0, min: 0 },
      discount_amount: { type: Number, default: 0, min: 0 },
      apply_scope: { type: String, default: "", trim: true },
    },
    subtotal_price: { type: Number, default: 0, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    cancelled_by: {
      type: String,
      enum: ["cinema", "customer", "system", null],
      default: null,
    },
    cancellation_reason: { type: String, default: "", trim: true },
    cancelled_at: { type: Date, default: null },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    payment_provider: { type: String, default: "internal", trim: true },
    payment_transaction_id: { type: String, default: "", trim: true },
    paid_at: { type: Date, default: null },
    reward_points_earned: { type: Number, default: 0, min: 0 },
    reward_points_credited_at: { type: Date, default: null },
    reward_points_reversed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
