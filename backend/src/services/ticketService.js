import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";

const QR_TOKEN_ENCRYPTION_VERSION = "v1";
export const TICKET_QR_PREFIX = "AURA_TICKET:";
const MAX_QR_PAYLOAD_LENGTH = 512;

const normalizeText = (value = "") => String(value || "").trim();

const normalizeUpperText = (value = "") => normalizeText(value).toUpperCase();

const getEncryptionSecret = () =>
  process.env.TICKET_QR_ENCRYPTION_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SEPAY_WEBHOOK_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "auracinema-ticket-dev-secret") ||
  "";

const getEncryptionKey = () => {
  const secret = getEncryptionSecret();

  if (!secret) {
    throw Object.assign(new Error("Thieu TICKET_QR_ENCRYPTION_SECRET hoac JWT_SECRET de tao QR ve"), {
      statusCode: 500,
    });
  }

  return crypto.createHash("sha256").update(secret).digest();
};

export const hashQrToken = (token) =>
  crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");

export const buildTicketQrPayload = (token) => `${TICKET_QR_PREFIX}${String(token || "").trim()}`;

export const parseTicketQrPayload = (value) => {
  if (typeof value !== "string") return "";
  const payload = value.trim();
  if (!payload || payload.length > MAX_QR_PAYLOAD_LENGTH || !payload.startsWith(TICKET_QR_PREFIX)) {
    return "";
  }
  return payload.slice(TICKET_QR_PREFIX.length).trim();
};

export const encryptQrToken = (token) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(token || ""), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    QR_TOKEN_ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
};

export const decryptQrToken = (encryptedToken) => {
  const [version, ivValue, authTagValue, encryptedValue] = String(encryptedToken || "").split(":");

  if (version !== QR_TOKEN_ENCRYPTION_VERSION || !ivValue || !authTagValue || !encryptedValue) {
    throw Object.assign(new Error("Du lieu QR token khong hop le"), { statusCode: 500 });
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const buildSeatLabel = (seat = {}) => {
  const seatCode = normalizeUpperText(seat.seat_code);
  if (seatCode) return seatCode;

  return normalizeUpperText(`${seat.seat_row || ""}${seat.seat_number || ""}`);
};

const buildTicketCode = ({ bookingCode, seatLabel }) =>
  normalizeUpperText(`${bookingCode}-${seatLabel}`).replace(/\s+/g, "");

const assertBookingCanIssueTickets = (booking) => {
  if (!booking) {
    throw Object.assign(new Error("Khong tim thay don ve"), { statusCode: 404 });
  }

  if (booking.status !== "confirmed" || booking.payment_status !== "paid") {
    throw Object.assign(new Error("Chi tao ve khi don hang da thanh toan thanh cong"), {
      statusCode: 409,
    });
  }
};

const populatePaidBookingForTickets = (query) =>
  query
    .populate({
      path: "showtime_id",
      select: "movie_id room_id start_time end_time",
    })
    .populate({
      path: "showtime_seat_ids",
      select: "showtime_id seat_id price",
      populate: {
        path: "seat_id",
        select: "seat_row seat_number seat_code room_id",
      },
    });

const buildTicketDraft = ({ booking, showtime, showtimeSeat }) => {
  const seat = showtimeSeat.seat_id || {};
  const seatLabel = buildSeatLabel(seat);

  if (!showtimeSeat.seat_id || !seatLabel) {
    console.error("Du lieu ghe khong hop le khi tao ve", {
      bookingId: String(booking._id),
      showtimeSeatId: String(showtimeSeat._id || ""),
      seatId: String(showtimeSeat.seat_id?._id || showtimeSeat.seat_id || ""),
    });
    throw Object.assign(new Error("Thong tin ghe cua don ve khong hop le"), { statusCode: 409 });
  }

  const qrToken = crypto.randomUUID();

  return {
    ticketCode: buildTicketCode({
      bookingCode: booking.booking_code,
      seatLabel,
    }),
    bookingId: booking._id,
    userId: booking.user_id,
    movieId: showtime.movie_id,
    showtimeId: showtime._id,
    roomId: showtime.room_id,
    seatId: seat._id,
    seatLabel,
    price: Number(showtimeSeat.price || 0),
    qrTokenHash: hashQrToken(qrToken),
    qrTokenEncrypted: encryptQrToken(qrToken),
    status: "VALID",
  };
};

const getDuplicateKeyError = (error) => {
  if (error?.code === 11000) return error;
  if (Array.isArray(error?.writeErrors)) {
    return error.writeErrors.find((item) => item?.code === 11000);
  }
  if (Array.isArray(error?.writeConcernErrors)) {
    return error.writeConcernErrors.find((item) => item?.code === 11000);
  }

  return null;
};

export const createTicketsForPaidBooking = async (bookingOrId, options = {}) => {
  const session = options.session || null;
  const includeQrPayloads = options.includeQrPayloads === true;
  const bookingId = typeof bookingOrId === "object" ? bookingOrId._id : bookingOrId;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw Object.assign(new Error("bookingId khong hop le"), { statusCode: 400 });
  }

  const booking = await populatePaidBookingForTickets(
    Booking.findById(bookingId).session(session),
  );

  assertBookingCanIssueTickets(booking);

  const showtime = booking.showtime_id;
  const showtimeSeats = booking.showtime_seat_ids || [];

  if (!showtime?._id || !showtime.movie_id || !showtime.room_id) {
    throw Object.assign(new Error("Thong tin suat chieu cua don ve khong day du"), { statusCode: 409 });
  }

  if (!showtimeSeats.length) {
    throw Object.assign(new Error("Don ve khong co ghe de tao ve dien tu"), { statusCode: 409 });
  }

  const existingTickets = await Ticket.find({ bookingId: booking._id })
    .select("+qrTokenEncrypted")
    .session(session);
  const existingSeatIds = new Set(existingTickets.map((ticket) => String(ticket.seatId)));
  const missingShowtimeSeats = showtimeSeats.filter((showtimeSeat) => {
    const seatId = showtimeSeat.seat_id?._id || showtimeSeat.seat_id;
    return seatId && !existingSeatIds.has(String(seatId));
  });

  if (missingShowtimeSeats.length) {
    const drafts = missingShowtimeSeats.map((showtimeSeat) =>
      buildTicketDraft({
        booking,
        showtime,
        showtimeSeat,
      }),
    );

    const operations = drafts.map((draft) => ({
      updateOne: {
        filter: {
          showtimeId: draft.showtimeId,
          seatId: draft.seatId,
        },
        update: {
          $setOnInsert: draft,
        },
        upsert: true,
      },
    }));

    try {
      await Ticket.bulkWrite(operations, {
        ordered: false,
        session,
      });
    } catch (error) {
      if (!getDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  const tickets = await Ticket.find({ bookingId: booking._id })
    .sort({ seatLabel: 1 })
    .select("+qrTokenEncrypted")
    .session(session);

  if (tickets.length !== showtimeSeats.length) {
    console.error("So luong ve tao ra khong khop so ghe trong don", {
      bookingId: String(booking._id),
      expected: showtimeSeats.length,
      actual: tickets.length,
    });
    throw Object.assign(new Error("Khong the tao du ve cho tat ca ghe trong don"), {
      statusCode: 409,
    });
  }

  return {
    bookingId: booking._id,
    tickets,
    qrPayloads: includeQrPayloads
      ? tickets.map((ticket) => ({
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        seatLabel: ticket.seatLabel,
        qrPayload: buildTicketQrPayload(decryptQrToken(ticket.qrTokenEncrypted)),
      }))
      : [],
  };
};

export const cancelValidTicketsForBooking = async (bookingId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw Object.assign(new Error("bookingId khong hop le"), { statusCode: 400 });
  }

  return Ticket.updateMany(
    { bookingId, status: "VALID" },
    { $set: { status: "CANCELLED" } },
    { session: options.session || null },
  );
};

export const getTicketQrPayloadsForBooking = async ({ bookingId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw Object.assign(new Error("bookingId khong hop le"), { statusCode: 400 });
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user_id: userId,
    status: "confirmed",
    payment_status: "paid",
  });

  if (!booking) {
    throw Object.assign(new Error("Khong tim thay don ve da thanh toan"), { statusCode: 404 });
  }

  const result = await createTicketsForPaidBooking(booking._id, {
    includeQrPayloads: true,
  });

  return result.qrPayloads;
};
