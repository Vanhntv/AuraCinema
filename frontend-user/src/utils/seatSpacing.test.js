import assert from "node:assert/strict";
import test from "node:test";
import { validateBookingSeatSpacing } from "./seatSpacing.js";

const seats = Array.from({ length: 10 }, (_, index) => ({
  _id: `A${index + 1}`, status: "available",
  seat_id: { seat_row: "A", seat_number: index + 1 },
}));
const validate = (nextIds, currentIds) => {
  const current = seats.filter((seat) => currentIds.includes(seat._id));
  const heldSeats = seats.map((seat) => ({ ...seat, status: currentIds.includes(seat._id) ? "held" : seat.status }));
  return validateBookingSeatSpacing(seats.filter((seat) => nextIds.includes(seat._id)), heldSeats, current, () => "normal");
};

test("cannot release the held middle seat from A1 A2 A3", () => {
  assert.match(validate(["A1", "A3"], ["A1", "A2", "A3"]), /ghế trống/);
  assert.equal(validate(["A1", "A2"], ["A1", "A2", "A3"]), "");
});

test("cannot release a held edge seat leaving one empty seat", () => {
  assert.match(validate(["A9"], ["A9", "A10"]), /ngoài cùng/);
  assert.match(validate(["A2"], ["A1", "A2"]), /ngoài cùng/);
  assert.equal(validate([], ["A9", "A10"]), "");
});

test("another customer's held seat is not treated as an empty gap", () => {
  const otherHeld = seats.map((seat) => seat._id === "A2" ? { ...seat, status: "held" } : seat);
  assert.equal(validateBookingSeatSpacing([seats[0], seats[2]], otherHeld, [], () => "normal"), "");
});
