import assert from "node:assert/strict";
import test from "node:test";
import {
  PRICING_MODE_CUSTOM,
  PRICING_MODE_STANDARD,
  buildCustomPriceDrafts,
  buildShowtimePricingFields,
  findPricingDayTypeForStartTime,
  groupShowtimePricingQuotes,
} from "./showtimePricing.js";

test("standard pricing payload leaves seat prices to the backend", () => {
  assert.deepEqual(
    buildShowtimePricingFields({
      mode: PRICING_MODE_STANDARD,
      formData: {
        normal_price: "70000",
        vip_price: "90000",
        couple_price: "160000",
      },
    }),
    { pricing_mode: PRICING_MODE_STANDARD },
  );
});

test("custom pricing payload snapshots all three seat prices", () => {
  assert.deepEqual(
    buildShowtimePricingFields({
      mode: PRICING_MODE_CUSTOM,
      prices: {
        normal: "65000",
        vip: "85000",
        couple: "150000",
      },
    }),
    {
      pricing_mode: PRICING_MODE_CUSTOM,
      base_price: 65000,
      seat_prices: { normal: 65000, vip: 85000, couple: 150000 },
    },
  );
});

test("pricing preview keeps weekday and weekend dates in separate groups", () => {
  const groups = groupShowtimePricingQuotes([
    {
      date: "2026-09-27",
      pricing_day_type: "weekend",
      seat_prices: { normal: 70000, vip: 90000, couple: 160000 },
    },
    {
      date: "2026-09-27",
      pricing_day_type: "weekend",
      seat_prices: { normal: 70000, vip: 90000, couple: 160000 },
    },
    {
      date: "2026-09-28",
      pricing_day_type: "weekday",
      seat_prices: { normal: 50000, vip: 70000, couple: 120000 },
    },
  ]);

  assert.deepEqual(groups, [
    {
      dayType: "weekend",
      dates: ["2026-09-27"],
      slotCount: 2,
      prices: { normal: 70000, vip: 90000, couple: 160000 },
    },
    {
      dayType: "weekday",
      dates: ["2026-09-28"],
      slotCount: 1,
      prices: { normal: 50000, vip: 70000, couple: 120000 },
    },
  ]);
});

test("custom drafts initialize independent weekday and weekend prices", () => {
  const quotes = [
    {
      start_time: "2026-09-27T01:00:00.000Z",
      pricing_day_type: "weekend",
      seat_prices: { normal: 70000, vip: 90000, couple: 160000 },
    },
    {
      start_time: "2026-09-28T01:00:00.000Z",
      pricing_day_type: "weekday",
      seat_prices: { normal: 50000, vip: 70000, couple: 120000 },
    },
  ];

  assert.deepEqual(buildCustomPriceDrafts({ quotes }), {
    weekend: {
      normal: "70000",
      vip: "90000",
      couple: "160000",
      standardPrices: {
        normal: "70000",
        vip: "90000",
        couple: "160000",
      },
      hasMixedPrices: false,
    },
    weekday: {
      normal: "50000",
      vip: "70000",
      couple: "120000",
      standardPrices: {
        normal: "50000",
        vip: "70000",
        couple: "120000",
      },
      hasMixedPrices: false,
    },
  });
  assert.equal(
    findPricingDayTypeForStartTime(quotes, "2026-09-28T01:00:00.000Z"),
    "weekday",
  );
});

test("editing mixed prices requires an explicit replacement for that day type", () => {
  const quotes = [
    {
      start_time: "2026-09-28T01:00:00.000Z",
      pricing_day_type: "weekday",
      seat_prices: { normal: 50000, vip: 70000, couple: 120000 },
    },
    {
      start_time: "2026-09-29T01:00:00.000Z",
      pricing_day_type: "weekday",
      seat_prices: { normal: 50000, vip: 70000, couple: 120000 },
    },
  ];
  const showtimes = [
    {
      start_time: quotes[0].start_time,
      pricing_day_type: "weekday",
      seat_prices: { normal: 55000, vip: 75000, couple: 130000 },
    },
    {
      start_time: quotes[1].start_time,
      pricing_day_type: "weekday",
      seat_prices: { normal: 60000, vip: 80000, couple: 140000 },
    },
  ];

  assert.deepEqual(buildCustomPriceDrafts({ quotes, showtimes }).weekday, {
    normal: "",
    vip: "",
    couple: "",
    standardPrices: {
      normal: "50000",
      vip: "70000",
      couple: "120000",
    },
    hasMixedPrices: true,
  });
});
