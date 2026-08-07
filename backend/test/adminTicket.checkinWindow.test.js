import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTicketForCheckIn } from "../src/controllers/adminTicketControllers.js";

const createTicket = ({
  startTime = "2026-08-08T08:15:00.000Z",
  endTime = "2026-08-08T10:15:00.000Z",
  duration = 120,
  status = "VALID",
} = {}) => ({
  status,
  checkedInAt: status === "CHECKED_IN" ? new Date("2026-08-08T07:30:00.000Z") : null,
  bookingId: {
    payment_status: "paid",
    status: "confirmed",
  },
  showtimeId: {
    start_time: new Date(startTime),
    end_time: endTime ? new Date(endTime) : null,
  },
  movieId: {
    duration,
  },
});

test("check-in is allowed at any time before the movie starts", () => {
  const result = evaluateTicketForCheckIn(
    createTicket(),
    new Date("2026-08-01T00:00:00.000Z"),
  );

  assert.equal(result.allowed, true);
  assert.equal(result.result, "SUCCESS");
  assert.equal(result.checkInWindow.opensAt, null);
});

test("check-in remains allowed while the movie is showing", () => {
  const result = evaluateTicketForCheckIn(
    createTicket(),
    new Date("2026-08-08T09:30:00.000Z"),
  );

  assert.equal(result.allowed, true);
});

test("check-in is rejected after the showtime ends", () => {
  const result = evaluateTicketForCheckIn(
    createTicket(),
    new Date("2026-08-08T10:15:01.000Z"),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.result, "EXPIRED");
  assert.match(result.message, /đã kết thúc/i);
});

test("movie duration is used when showtime end time is missing", () => {
  const ticket = createTicket({ endTime: null, duration: 90 });
  const beforeEnd = evaluateTicketForCheckIn(ticket, new Date("2026-08-08T09:44:59.000Z"));
  const afterEnd = evaluateTicketForCheckIn(ticket, new Date("2026-08-08T09:45:01.000Z"));

  assert.equal(beforeEnd.allowed, true);
  assert.equal(afterEnd.allowed, false);
});
