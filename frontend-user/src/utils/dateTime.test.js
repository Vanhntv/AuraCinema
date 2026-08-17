import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRelativeDateOptions,
  isShowtimeUpcoming,
} from "./dateTime.js";

test("uses concrete day-month labels for today and tomorrow", () => {
  const [today, tomorrow] = buildRelativeDateOptions(2);

  assert.equal(today.label, today.displayDate);
  assert.equal(tomorrow.label, tomorrow.displayDate);
  assert.match(today.label, /^\d{2}-\d{2}$/);
  assert.match(tomorrow.label, /^\d{2}-\d{2}$/);
});

test("does not treat a cancelled future showtime as upcoming", () => {
  const currentTime = Date.parse("2026-08-17T00:00:00+07:00");
  const showtime = {
    start_time: "2026-08-18T08:00:00+07:00",
    status: "cancelled",
  };

  assert.equal(isShowtimeUpcoming(showtime, currentTime), false);
});
