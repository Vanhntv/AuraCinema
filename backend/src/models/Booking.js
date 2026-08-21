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
    ticketing_version: { type: Number, enum: [1, 2], default: 1, index: true },
    order_qr: {
      token_hash: { type: String, default: "", trim: true },
      token_encrypted: { type: String, default: "", trim: true, select: false },
      issued_at: { type: Date, default: null },
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seat_hold_id: { type: mongoose.Schema.Types.ObjectId, ref: "SeatHold", default: null },
    showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
    showtime_seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowtimeSeat", required: true }],
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, required: true, trim: true, lowercase: true },
    customer_phone: { type: String, default: null, trim: true },
    movie_snapshot: {
      movie_id: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", default: null },
      title: { type: String, default: "", trim: true },
      poster: { type: String, default: "", trim: true },
      age_classification: { type: String, default: "P", trim: true },
    },
    showtime_snapshot: {
      showtime_id: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", default: null },
      start_time: { type: Date, default: null },
      end_time: { type: Date, default: null },
      cinema_id: { type: mongoose.Schema.Types.ObjectId, ref: "Cinema", default: null },
      cinema_name: { type: String, default: "", trim: true },
      cinema_address: { type: String, default: "", trim: true },
      room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
      room_name: { type: String, default: "", trim: true },
    },
    seat_items: [
      {
        _id: false,
        showtime_seat_id: { type: mongoose.Schema.Types.ObjectId, ref: "ShowtimeSeat", required: true },
        seat_id: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
        seat_code: { type: String, default: "", trim: true, uppercase: true },
        seat_label: { type: String, required: true, trim: true, uppercase: true },
        seat_type: { type: String, default: "", trim: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
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
    pricing: {
      ticket_subtotal: { type: Number, default: 0, min: 0 },
      service_subtotal: { type: Number, default: 0, min: 0 },
      subtotal: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
    },
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
      enum: ["pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"],
      default: "pending",
    },
    payment_expires_at: { type: Date, default: null },
    resources_released_at: { type: Date, default: null },
    payment_provider: { type: String, default: "internal", trim: true },
    payment_transaction_id: { type: String, default: "", trim: true },
    paid_at: { type: Date, default: null },
    reward_points_earned: { type: Number, default: 0, min: 0 },
    reward_points_credited_at: { type: Date, default: null },
    reward_points_reversed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

bookingSchema.index({ status: 1, payment_status: 1, payment_expires_at: 1 });
bookingSchema.index(
  { "order_qr.token_hash": 1 },
  { unique: true, partialFilterExpression: { "order_qr.token_hash": { $type: "string", $gt: "" } } },
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
