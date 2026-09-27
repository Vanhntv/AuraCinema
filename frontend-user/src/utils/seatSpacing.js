import { validateSeatSpacing } from "../../../shared/seatSpacing.mjs";

export function validateBookingSeatSpacing(nextSeats, allSeats, currentSeats, getSeatType) {
  const currentIds = new Set(currentSeats.map((seat) => String(seat._id)));
  return validateSeatSpacing(nextSeats.map((seat) => String(seat._id)), allSeats.map((seat) => ({
    id: String(seat._id),
    row: seat.seat_id?.seat_row || "?",
    number: Number(seat.seat_id?.seat_number),
    // Our held seats become empty if removed from the proposed selection.
    status: currentIds.has(String(seat._id))
      ? "available"
      : String(seat.status || "available").trim().toLowerCase(),
    type: getSeatType(seat),
  })));
}
