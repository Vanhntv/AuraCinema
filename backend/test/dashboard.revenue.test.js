import test from "node:test";
import assert from "node:assert/strict";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDateRange,
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

test("getDateRange validates a calendar date and creates Vietnam boundaries", () => {
  const range = getDateRange("2026-08-07");

  assert.equal(range.start.toISOString(), "2026-08-06T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-07T17:00:00.000Z");
  assert.equal(getDateRange("2026-02-30"), null);
  assert.equal(getDateRange("07-08-2026"), null);
});

test("getDashboardOverview returns tickets and successful paid bookings", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [{
      revenue: [{ total: 500000 }],
      tickets: [{ total: 4 }],
      successfulBookings: [{ total: 2 }],
    }];
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
  assert.equal(responseBody.data.successfulBookings, 2);
  assert.deepEqual(
    receivedPipeline[1].$facet.successfulBookings[0],
    { $match: { status: { $in: ["confirmed", "checked_in"] } } },
  );
});

test("getDailyRevenue returns revenue, seats, and bookings for the selected date", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [{ revenue: 12500000, ticketsSold: 126, bookingCount: 74 }];
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
    await getDailyRevenue({ query: { date: "2026-08-07" } }, response);
  } finally {
    Booking.aggregate = originalAggregate;
  }

  assert.equal(
    receivedPipeline[0].$match.created_at.$gte.toISOString(),
    "2026-08-06T17:00:00.000Z",
  );
  assert.equal(
    receivedPipeline[0].$match.created_at.$lt.toISOString(),
    "2026-08-07T17:00:00.000Z",
  );
  assert.deepEqual(
    {
      revenue: responseBody.data.revenue,
      ticketsSold: responseBody.data.ticketsSold,
      bookingCount: responseBody.data.bookingCount,
    },
    { revenue: 12500000, ticketsSold: 126, bookingCount: 74 },
  );
});
