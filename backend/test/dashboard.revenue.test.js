import test from "node:test";
import assert from "node:assert/strict";
import { getTodayRange } from "../src/controllers/dashboardControllers.js";

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
