import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSeatTypeName, resolveSeatTypeTone } from "../src/utils/seatTypes.js";

test("Vietnamese Ghế đôi is recognized as couple seating", () => {
  assert.equal(normalizeSeatTypeName("Ghế đôi"), "ghe doi");
  assert.equal(resolveSeatTypeTone({ name: "Ghế đôi" }), "couple");
});
