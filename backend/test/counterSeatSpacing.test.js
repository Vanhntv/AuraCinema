import assert from "node:assert/strict";
import test from "node:test";
import { validateSeatSpacing } from "../../shared/seatSpacing.mjs";

const row = () => Array.from({ length: 10 }, (_, index) => ({
  id: `B${index + 1}`, row: "B", number: index + 1, status: "available", type: "regular",
}));

test("counter seats reject a single gap when selecting or deselecting", () => {
  assert.equal(validateSeatSpacing(["B1", "B2", "B3"], row()), "");
  assert.match(validateSeatSpacing(["B1", "B3"], row()), /cách nhau/);
});

test("counter seats reject an empty seat at either row edge", () => {
  assert.match(validateSeatSpacing(["B2"], row()), /ngoài cùng/);
  assert.match(validateSeatSpacing(["B9"], row()), /ngoài cùng/);
  assert.equal(validateSeatSpacing(["B1", "B2"], row()), "");
  assert.equal(validateSeatSpacing(["B9", "B10"], row()), "");
  assert.equal(validateSeatSpacing([], row()), "");
});

test("sold seats, other rows, aisles and couple seats do not count as empty gaps", () => {
  const seats = row();
  seats[1].status = "booked";
  assert.equal(validateSeatSpacing(["B1", "B3"], seats), "");
  assert.equal(validateSeatSpacing(["B1", "B3"], row().filter((seat) => seat.id !== "B2")), "");
  const couples = row().map((seat) => ({ ...seat, type: "couple" }));
  assert.equal(validateSeatSpacing(["B2"], couples), "");
  assert.equal(validateSeatSpacing(["B1", "C3"], [...row(), { id: "C3", row: "C", number: 3, status: "available", type: "regular" }]), "");
});
