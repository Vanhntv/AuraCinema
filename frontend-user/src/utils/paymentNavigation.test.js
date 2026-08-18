import test from "node:test";
import assert from "node:assert/strict";
import { buildPaymentClosePath } from "./paymentNavigation.js";

test("payment close returns to movie detail schedule using today's date without selecting a showtime", () => {
  const path = buildPaymentClosePath(
    { movieId: "movie-123" },
    new Date("2026-08-18T08:00:00+07:00"),
  );

  assert.equal(path, "/phim/movie-123?date=2026-08-18#lich-chieu");
  assert.equal(path.includes("showtime="), false);
});

test("payment close returns to the selected showtime date when available", () => {
  const path = buildPaymentClosePath(
    {
      movieId: "movie-123",
      showtimeId: "showtime-456",
      showtimeStartTime: "2026-08-19T10:30:00+07:00",
    },
    new Date("2026-08-18T08:00:00+07:00"),
  );

  assert.equal(path, "/phim/movie-123?date=2026-08-19&showtime=showtime-456#lich-chieu");
});

test("payment close keeps tickets page fallback when movie id is missing", () => {
  assert.equal(buildPaymentClosePath(null), "/tai-khoan?tab=tickets");
  assert.equal(buildPaymentClosePath({ movieId: "" }), "/tai-khoan?tab=tickets");
});
