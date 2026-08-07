import test from "node:test";
import assert from "node:assert/strict";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDateRange,
  getMonthlyRevenue,
  getMonthRange,
  getMovieRevenue,
  getTopMoviesRevenue,
  getTodayRange,
  getWeeklyRevenue,
  getWeekRange,
} from "../src/controllers/dashboardControllers.js";
import Booking from "../src/models/Booking.js";
import Movie from "../src/models/Movie.js";
import Showtime from "../src/models/Showtime.js";

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

test("getWeekRange uses Monday through Sunday in Vietnam", () => {
  const range = getWeekRange("2026-08-09");

  assert.equal(range.start.toISOString(), "2026-08-02T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-09T17:00:00.000Z");
  assert.deepEqual(
    range.days.map((item) => item.label),
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  );
  assert.equal(range.days[0].date, "2026-08-03");
  assert.equal(range.days[6].date, "2026-08-09");
});

test("getMonthRange returns every day in a leap-year month", () => {
  const range = getMonthRange("2", "2028");

  assert.equal(range.start.toISOString(), "2028-01-31T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2028-02-29T17:00:00.000Z");
  assert.equal(range.days.length, 29);
  assert.equal(range.days[0].date, "2028-02-01");
  assert.equal(range.days[28].date, "2028-02-29");
  assert.equal(getMonthRange("13", "2028"), null);
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

test("getWeeklyRevenue groups revenue and fills days without bookings", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [
      { _id: "2026-08-03", revenue: 8000000 },
      { _id: "2026-08-04", revenue: 7000000 },
    ];
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
    await getWeeklyRevenue({ query: { date: "2026-08-07" } }, response);
  } finally {
    Booking.aggregate = originalAggregate;
  }

  assert.equal(receivedPipeline[1].$group._id.$dateToString.timezone, "Asia/Ho_Chi_Minh");
  assert.deepEqual(
    responseBody.data.map(({ label, revenue }) => ({ label, revenue })),
    [
      { label: "T2", revenue: 8000000 },
      { label: "T3", revenue: 7000000 },
      { label: "T4", revenue: 0 },
      { label: "T5", revenue: 0 },
      { label: "T6", revenue: 0 },
      { label: "T7", revenue: 0 },
      { label: "CN", revenue: 0 },
    ],
  );
});

test("getMonthlyRevenue returns daily values and the monthly total", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [
      { _id: "2026-08-01", revenue: 10000000 },
      { _id: "2026-08-03", revenue: 8000000 },
    ];
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
    await getMonthlyRevenue(
      { query: { month: "8", year: "2026" } },
      response,
    );
  } finally {
    Booking.aggregate = originalAggregate;
  }

  assert.equal(receivedPipeline[1].$group._id.$dateToString.timezone, "Asia/Ho_Chi_Minh");
  assert.equal(responseBody.data.days.length, 31);
  assert.equal(responseBody.data.days[1].revenue, 0);
  assert.equal(responseBody.data.totalRevenue, 18000000);
});

test("getTopMoviesRevenue joins showtimes and returns the five highest movies", async () => {
  const originalAggregate = Booking.aggregate;
  let receivedPipeline;
  let responseBody;
  const topMovies = [
    { id: "movie-1", title: "Movie A", revenue: 20000000 },
    { id: "movie-2", title: "Movie B", revenue: 15000000 },
  ];

  Booking.aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return topMovies;
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
    await getTopMoviesRevenue({}, response);
  } finally {
    Booking.aggregate = originalAggregate;
  }

  assert.equal(receivedPipeline[1].$lookup.from, "showtimes");
  assert.equal(receivedPipeline[3].$lookup.from, "movies");
  assert.deepEqual(receivedPipeline[6], { $sort: { revenue: -1, title: 1 } });
  assert.deepEqual(receivedPipeline[7], { $limit: 5 });
  assert.deepEqual(responseBody.data, topMovies);
});

test("getMovieRevenue returns revenue metrics for one movie and date range", async () => {
  const originalAggregate = Booking.aggregate;
  const originalFindOne = Movie.findOne;
  const originalCountDocuments = Showtime.countDocuments;
  const movieId = "64f000000000000000000001";
  let bookingPipeline;
  let showtimeFilter;
  let responseBody;

  Booking.aggregate = async (pipeline) => {
    bookingPipeline = pipeline;
    return [{
      summary: [{ revenue: 48500000, ticketsSold: 425, bookingCount: 238 }],
      dailyRevenue: [
        { _id: "2026-08-01", revenue: 12000000 },
        { _id: "2026-08-02", revenue: 36500000 },
      ],
    }];
  };
  Movie.findOne = () => ({
    select: async () => ({ _id: movieId, title: "Avengers: Endgame" }),
  });
  Showtime.countDocuments = async (filter) => {
    showtimeFilter = filter;
    return 27;
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
    await getMovieRevenue(
      {
        params: { movieId },
        query: { from: "2026-08-01", to: "2026-08-07" },
      },
      response,
    );
  } finally {
    Booking.aggregate = originalAggregate;
    Movie.findOne = originalFindOne;
    Showtime.countDocuments = originalCountDocuments;
  }

  assert.equal(
    bookingPipeline[0].$match.created_at.$gte.toISOString(),
    "2026-07-31T17:00:00.000Z",
  );
  assert.equal(
    bookingPipeline[0].$match.created_at.$lt.toISOString(),
    "2026-08-07T17:00:00.000Z",
  );
  assert.equal(showtimeFilter.start_time.$lt.toISOString(), "2026-08-07T17:00:00.000Z");
  assert.equal(
    bookingPipeline[4].$facet.dailyRevenue[0].$group._id.$dateToString.timezone,
    "Asia/Ho_Chi_Minh",
  );
  assert.deepEqual(
    {
      revenue: responseBody.data.revenue,
      ticketsSold: responseBody.data.ticketsSold,
      bookingCount: responseBody.data.bookingCount,
      showtimeCount: responseBody.data.showtimeCount,
    },
    { revenue: 48500000, ticketsSold: 425, bookingCount: 238, showtimeCount: 27 },
  );
  assert.deepEqual(responseBody.data.dailyRevenue, [
    { date: "2026-08-01", label: "01/08", revenue: 12000000 },
    { date: "2026-08-02", label: "02/08", revenue: 36500000 },
  ]);
});
