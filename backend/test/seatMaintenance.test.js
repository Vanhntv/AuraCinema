import test from "node:test";
import assert from "node:assert/strict";
import { getSeatOperationalStatus, isSeatInMaintenance } from "../src/utils/seatStatus.js";

test("seat operational status supports legacy disabled seats", () => {
  assert.equal(getSeatOperationalStatus({ status: false }), "maintenance");
  assert.equal(getSeatOperationalStatus({ status: true }), "active");
  assert.equal(getSeatOperationalStatus({}), "active");
});

test("explicit maintenance status always makes a seat unavailable", () => {
  assert.equal(isSeatInMaintenance({ status: true, operational_status: "maintenance" }), true);
  assert.equal(isSeatInMaintenance({ status: true, operational_status: "active" }), false);
});
