import assert from "node:assert/strict";
import test from "node:test";
import {
  CINEMA_TIME_ZONE,
  getShowtimeDayType,
  getShowtimeLocalDate,
  resolveShowtimePricingSnapshot,
  resolveStandardShowtimePricing,
} from "../src/services/showtimePricingService.js";

const room = { room_type: "2D" };

test("mixed Sunday and Monday showtimes receive independent standard prices", () => {
  const sunday = resolveStandardShowtimePricing({
    room,
    startTime: "2026-09-27T01:00:00.000Z",
  });
  const monday = resolveStandardShowtimePricing({
    room,
    startTime: "2026-09-28T01:00:00.000Z",
  });

  assert.equal(CINEMA_TIME_ZONE, "Asia/Ho_Chi_Minh");
  assert.deepEqual(sunday.seat_prices, {
    normal: 70000,
    vip: 90000,
    couple: 160000,
  });
  assert.equal(sunday.pricing_day_type, "weekend");
  assert.deepEqual(monday.seat_prices, {
    normal: 50000,
    vip: 70000,
    couple: 120000,
  });
  assert.equal(monday.pricing_day_type, "weekday");
});

test("Vietnam timezone controls the local pricing date near midnight", () => {
  const instant = "2026-09-27T17:30:00.000Z";

  assert.equal(getShowtimeLocalDate(instant), "2026-09-28");
  assert.equal(getShowtimeDayType(instant), "weekday");
});

test("holiday pricing takes precedence over weekday and weekend pricing", () => {
  const holiday = resolveStandardShowtimePricing({
    room,
    startTime: "2027-05-01T01:00:00.000Z",
  });

  assert.equal(holiday.pricing_day_type, "holiday");
  assert.deepEqual(holiday.seat_prices, {
    normal: 80000,
    vip: 100000,
    couple: 180000,
  });
});

test("custom pricing remains an explicit snapshot", () => {
  const pricing = resolveShowtimePricingSnapshot({
    pricingMode: "custom",
    basePrice: 65000,
    seatPrices: { normal: 65000, vip: 85000, couple: 150000 },
    room,
    startTime: "2026-09-28T01:00:00.000Z",
  });

  assert.equal(pricing.pricing_mode, "custom");
  assert.equal(pricing.pricing_day_type, "weekday");
  assert.equal(pricing.pricing_rule_version, null);
  assert.deepEqual(pricing.seat_prices, {
    normal: 65000,
    vip: 85000,
    couple: 150000,
  });
});
