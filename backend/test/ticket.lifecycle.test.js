import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { cancelBooking } from "../src/controllers/bookingsControllers.js";
import { formatTicketForOwner, getMyTicketsByBooking } from "../src/controllers/ticketControllers.js";
import {
  claimTicketPrintOnce,
  evaluateTicketForCheckIn,
  formatTicketForAdmin,
} from "../src/controllers/adminTicketControllers.js";
import Booking from "../src/models/Booking.js";
import ShowtimeSeat from "../src/models/ShowtimeSeat.js";
import Ticket from "../src/models/Ticket.js";
import VoucherUsage from "../src/models/VoucherUsage.js";
import {
  buildTicketQrPayload,
  cancelValidTicketsForBooking,
  createTicketsForPaidBooking,
  decryptQrToken,
  parseTicketQrPayload,
} from "../src/services/ticketService.js";

const withPatched = async (patches, callback) => {
  const originals = patches.map(([target, key, value]) => {
    const original = target[key];
    target[key] = value;
    return [target, key, original];
  });

  try {
    return await callback();
  } finally {
    for (const [target, key, original] of originals.reverse()) {
      target[key] = original;
    }
  }
};

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const makePopulateQuery = (value) => ({
  populate() {
    return this;
  },
  session() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

const makeTicketFind = (getValue) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  session: async () => getValue(),
});

const makePaidBooking = (seatCount = 3) => {
  const bookingId = new mongoose.Types.ObjectId();
  const showtimeId = new mongoose.Types.ObjectId();
  const roomId = new mongoose.Types.ObjectId();
  const movieId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const showtimeSeats = Array.from({ length: seatCount }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(),
    price: 75000,
    seat_id: {
      _id: new mongoose.Types.ObjectId(),
      seat_row: "A",
      seat_number: index + 1,
      seat_code: `A${index + 1}`,
      seat_type_id: { name: "Ghế thường" },
    },
  }));

  return {
    _id: bookingId,
    booking_code: "AURA000000000001",
    user_id: userId,
    status: "confirmed",
    payment_status: "paid",
    showtime_id: {
      _id: showtimeId,
      movie_id: movieId,
      room_id: roomId,
    },
    showtime_seat_ids: showtimeSeats,
  };
};

test("ticket QR payload requires the AURA_TICKET prefix", () => {
  const token = "secure-random-token";
  assert.equal(buildTicketQrPayload(token), `AURA_TICKET:${token}`);
  assert.equal(parseTicketQrPayload(`AURA_TICKET:${token}`), token);
  assert.equal(parseTicketQrPayload("AURA000000000001"), "");
  assert.equal(parseTicketQrPayload(token), "");
});

test("unpaid booking cannot issue tickets", async () => {
  const booking = makePaidBooking(1);
  booking.status = "pending";
  booking.payment_status = "pending";

  await withPatched([
    [Booking, "findById", () => makePopulateQuery(booking)],
  ], async () => {
    await assert.rejects(
      createTicketsForPaidBooking(booking._id),
      (error) => error.statusCode === 409 && /thanh toan/i.test(error.message),
    );
  });
});

test("paid booking issues exactly one independently secured ticket per seat", async () => {
  const booking = makePaidBooking(3);
  let findCall = 0;
  let insertedDrafts = [];

  await withPatched([
    [Booking, "findById", () => makePopulateQuery(booking)],
    [Ticket, "find", () => {
      findCall += 1;
      return makeTicketFind(() => (findCall === 1 ? [] : insertedDrafts));
    }],
    [Ticket, "bulkWrite", async (operations) => {
      insertedDrafts = operations.map((operation) => ({
        _id: new mongoose.Types.ObjectId(),
        ...operation.updateOne.update.$setOnInsert,
      }));
      return { upsertedCount: insertedDrafts.length };
    }],
  ], async () => {
    const result = await createTicketsForPaidBooking(booking._id, { includeQrPayloads: true });

    assert.equal(result.tickets.length, 3);
    assert.equal(result.qrPayloads.length, 3);
    assert.equal(new Set(result.tickets.map((ticket) => String(ticket.seatId))).size, 3);
    assert.equal(new Set(result.tickets.map((ticket) => ticket.qrTokenHash)).size, 3);
    assert.equal(new Set(result.qrPayloads.map((item) => item.qrPayload)).size, 3);
    result.qrPayloads.forEach((item) => assert.match(item.qrPayload, /^AURA_TICKET:/));
    insertedDrafts.forEach((ticket) => {
      assert.ok(decryptQrToken(ticket.qrTokenEncrypted));
      assert.equal(ticket.seatType, "Ghế thường");
    });
  });
});

test("ticket issuance is idempotent when every seat already has a ticket", async () => {
  const booking = makePaidBooking(2);
  const existingTickets = booking.showtime_seat_ids.map((showtimeSeat, index) => ({
    _id: new mongoose.Types.ObjectId(),
    ticketCode: `${booking.booking_code}-A${index + 1}`,
    bookingId: booking._id,
    seatId: showtimeSeat.seat_id._id,
    seatLabel: `A${index + 1}`,
    qrTokenEncrypted: "unused-in-this-test",
  }));
  let bulkWriteCalled = false;

  await withPatched([
    [Booking, "findById", () => makePopulateQuery(booking)],
    [Ticket, "find", () => makeTicketFind(() => existingTickets)],
    [Ticket, "bulkWrite", async () => {
      bulkWriteCalled = true;
    }],
  ], async () => {
    const result = await createTicketsForPaidBooking(booking._id);
    assert.equal(result.tickets.length, 2);
    assert.equal(bulkWriteCalled, false);
  });
});

test("cancelled tickets do not block a new ticket allocation for the same showtime seat", async () => {
  const booking = makePaidBooking(1);
  const cancelledTicket = {
    _id: new mongoose.Types.ObjectId(),
    bookingId: new mongoose.Types.ObjectId(),
    showtimeId: booking.showtime_id._id,
    seatId: booking.showtime_seat_ids[0].seat_id._id,
    status: "CANCELLED",
  };
  let capturedFilter = null;
  let insertedDrafts = [];
  let findCall = 0;

  await withPatched([
    [Booking, "findById", () => makePopulateQuery(booking)],
    [Ticket, "find", (filter) => {
      findCall += 1;
      if (filter.showtimeId) {
        return makeTicketFind(() => [cancelledTicket]);
      }
      return makeTicketFind(() => (findCall === 1 ? [] : insertedDrafts));
    }],
    [Ticket, "bulkWrite", async (operations) => {
      capturedFilter = operations[0].updateOne.filter;
      insertedDrafts = operations.map((operation) => ({
        _id: new mongoose.Types.ObjectId(),
        ...operation.updateOne.update.$setOnInsert,
      }));
      return { upsertedCount: insertedDrafts.length };
    }],
  ], async () => {
    const result = await createTicketsForPaidBooking(booking._id);

    assert.equal(result.tickets.length, 1);
    assert.deepEqual(capturedFilter.status.$in, ["VALID", "CHECKED_IN"]);
  });
});

test("customer cannot cancel a confirmed paid booking", async () => {
  const booking = {
    _id: new mongoose.Types.ObjectId(),
    status: "confirmed",
    payment_status: "paid",
    saveCalled: false,
    async save() {
      this.saveCalled = true;
    },
  };
  const fakeSession = {
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  };

  await withPatched([
    [mongoose, "startSession", async () => fakeSession],
    [Booking, "findOne", () => ({ session: async () => booking })],
  ], async () => {
    const req = {
      params: { id: String(booking._id) },
      user: { id: String(new mongoose.Types.ObjectId()) },
      body: { refund_voucher: true },
    };
    const res = makeResponse();
    await cancelBooking(req, res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /không thể tự hủy hoặc đổi/i);
    assert.equal(booking.saveCalled, false);
  });
});

test("customer can cancel only a pending unpaid booking", async () => {
  const seatId = new mongoose.Types.ObjectId();
  const booking = {
    _id: new mongoose.Types.ObjectId(),
    status: "pending",
    payment_status: "pending",
    showtime_seat_ids: [seatId],
    combos: [],
    async save() {
      return this;
    },
  };
  const fakeSession = {
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  };
  let releasedSeats = false;

  await withPatched([
    [mongoose, "startSession", async () => fakeSession],
    [Booking, "findOne", () => ({ session: async () => booking })],
    [VoucherUsage, "findOne", () => ({ session: async () => null })],
    [ShowtimeSeat, "updateMany", async () => {
      releasedSeats = true;
      return { modifiedCount: 1 };
    }],
  ], async () => {
    const req = {
      params: { id: String(booking._id) },
      user: { id: String(new mongoose.Types.ObjectId()) },
      body: { reason: "Khách hủy trước thanh toán" },
    };
    const res = makeResponse();
    await cancelBooking(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(booking.status, "cancelled");
    assert.equal(booking.payment_status, "cancelled");
    assert.equal(booking.cancelled_by, "customer");
    assert.equal(releasedSeats, true);
  });
});

test("user cannot access tickets for another user's booking", async () => {
  const bookingId = new mongoose.Types.ObjectId();
  const currentUserId = new mongoose.Types.ObjectId();
  let capturedFilter;

  await withPatched([
    [Booking, "findOne", (filter) => {
      capturedFilter = filter;
      return { select: async () => null };
    }],
  ], async () => {
    const req = {
      params: { bookingId: String(bookingId) },
      user: { id: String(currentUserId) },
    };
    const res = makeResponse();
    await getMyTicketsByBooking(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(String(capturedFilter._id), String(bookingId));
    assert.equal(String(capturedFilter.user_id), String(currentUserId));
  });
});

test("customer ticket response never exposes QR token storage fields", () => {
  const response = formatTicketForOwner({
    _id: new mongoose.Types.ObjectId(),
    ticketCode: "AURA000000000001-A1",
    bookingId: null,
    movieId: null,
    showtimeId: null,
    roomId: null,
    seatId: new mongoose.Types.ObjectId(),
    seatLabel: "A1",
    price: 75000,
    status: "VALID",
    qrTokenHash: "must-not-leak",
    qrTokenEncrypted: "must-not-leak",
  });

  assert.equal(Object.hasOwn(response, "qrTokenHash"), false);
  assert.equal(Object.hasOwn(response, "qrTokenEncrypted"), false);
  assert.equal(JSON.stringify(response).includes("must-not-leak"), false);
});

test("admin scanned ticket includes cinema details required by the shared print template", () => {
  const cinemaId = new mongoose.Types.ObjectId();
  const roomId = new mongoose.Types.ObjectId();
  const response = formatTicketForAdmin({
    _id: new mongoose.Types.ObjectId(),
    ticketCode: "AURA000000000001-A1",
    roomId: {
      _id: roomId,
      name: "Phòng A1",
      cinema_id: {
        _id: cinemaId,
        name: "AuraCinema Láng Hạ",
        address: "87 Láng Hạ, Hà Nội",
      },
    },
    seatId: new mongoose.Types.ObjectId(),
    seatLabel: "A1",
    price: 75000,
    status: "VALID",
  });

  assert.equal(response.room.name, "Phòng A1");
  assert.equal(response.cinema.name, "AuraCinema Láng Hạ");
  assert.equal(response.cinema.address, "87 Láng Hạ, Hà Nội");
});

test("ticket print claim is atomic and permits only an unprinted ticket", async () => {
  const adminId = new mongoose.Types.ObjectId();
  const now = new Date("2030-01-01T10:00:00.000Z");
  let capturedFilter;
  let capturedUpdate;
  let capturedOptions;

  await withPatched([
    [Ticket, "findOneAndUpdate", async (filter, update, options) => {
      capturedFilter = filter;
      capturedUpdate = update;
      capturedOptions = options;
      return { _id: new mongoose.Types.ObjectId(), printedAt: now, printedBy: adminId };
    }],
  ], async () => {
    await claimTicketPrintOnce({
      qrToken: "one-time-print-token",
      adminId,
      now,
    });
  });

  assert.equal(capturedFilter.printedAt, null);
  assert.equal(typeof capturedFilter.qrTokenHash, "string");
  assert.equal(capturedFilter.qrTokenHash.length, 64);
  assert.equal(capturedUpdate.$set.printedAt, now);
  assert.equal(capturedUpdate.$set.printedBy, adminId);
  assert.equal(capturedOptions.new, true);
});

test("cinema cancellation invalidates only still-valid tickets", async () => {
  const bookingId = new mongoose.Types.ObjectId();
  let capturedFilter;
  let capturedUpdate;

  await withPatched([
    [Ticket, "updateMany", async (filter, update) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { modifiedCount: 2 };
    }],
  ], async () => {
    await cancelValidTicketsForBooking(bookingId);
    assert.equal(String(capturedFilter.bookingId), String(bookingId));
    assert.equal(capturedFilter.status, "VALID");
    assert.equal(capturedUpdate.$set.status, "CANCELLED");
  });
});

test("checked-in, cancelled, expired and unpaid tickets cannot check in", () => {
  const baseTicket = {
    status: "VALID",
    bookingId: { status: "confirmed", payment_status: "paid" },
    showtimeId: {
      start_time: new Date("2030-01-01T10:00:00.000Z"),
      end_time: new Date("2030-01-01T12:00:00.000Z"),
    },
    movieId: { duration: 120 },
  };
  const now = new Date("2030-01-01T11:00:00.000Z");

  assert.equal(evaluateTicketForCheckIn({ ...baseTicket, status: "CHECKED_IN", checkedInAt: now }, now).result, "ALREADY_CHECKED_IN");
  assert.equal(evaluateTicketForCheckIn({ ...baseTicket, status: "CANCELLED" }, now).result, "CANCELLED");
  assert.equal(evaluateTicketForCheckIn({ ...baseTicket, status: "EXPIRED" }, now).result, "EXPIRED");
  assert.equal(evaluateTicketForCheckIn({ ...baseTicket, bookingId: { status: "pending", payment_status: "pending" } }, now).result, "PAYMENT_NOT_COMPLETED");
});
