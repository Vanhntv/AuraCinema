import test from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardOverview,
  getTodayRange,
} from "../src/controllers/dashboardControllers.js";
import Booking from "../src/models/Booking.js";

test("getTodayRange uses the Asia/Ho_Chi_Minh calendar day", () => {
  const range = getTodayRange(new Date("2026-08-07T16:59:59.999Z"));

  assert.equal(range.localDay, "2026-08-07");
  assert.equal(range.start.toISOString(), "2026-08-06T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-07T17:00:00.000Z");
});

test("getTodayRange rolls over at midnight in Ho Chi Minh City", () => {
  const range = getTodayRange(new Date("2026-08-07T17:00:00.000Z"));

  assert.equal(range.localDay, "2026-08-08");
  assert.equal(range.start.toISOString(), "2026-08-07T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-08T17:00:00.000Z");
});

test("getDashboardOverview returns the total seats from paid bookings", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [{ revenue: [{ total: 500000 }], tickets: [{ total: 4 }] }];
  };

  const response = {
    status(statusCode) {
      assert.equal(statusCode, 200);
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  try {
    await getDashboardOverview({}, response);
  } finally {
    Booking.aggregate = originalAggregate;
  }

  assert.deepEqual(receivedPipeline[0], {
    $match: { payment_status: "paid" },
  });
  assert.deepEqual(
    receivedPipeline[1].$facet.tickets[0].$group.total,
    { $sum: { $size: { $ifNull: ["$showtime_seat_ids", []] } } },
  );
  assert.equal(responseBody.data.ticketsSold, 4);
});
