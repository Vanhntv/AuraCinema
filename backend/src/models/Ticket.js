import mongoose from "mongoose";

export const TICKET_STATUSES = [
  "VALID",
  "CHECKED_IN",
  "CANCELLED",
  "EXPIRED",
];

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 64,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    showtimeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    seatLabel: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 12,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qrTokenHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 32,
      maxlength: 256,
    },
    qrTokenEncrypted: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
      select: false,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "VALID",
      required: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    printedAt: {
      type: Date,
      default: null,
    },
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "tickets",
  },
);

ticketSchema.index({ ticketCode: 1 }, { unique: true });
ticketSchema.index({ qrTokenHash: 1 }, { unique: true });
ticketSchema.index(
  { showtimeId: 1, seatId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["VALID", "CHECKED_IN"] } },
  },
);
ticketSchema.index({ bookingId: 1 });
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
