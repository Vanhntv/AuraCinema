// Seats use { id, row, number, status, type }; selected IDs belong to the current order.
export function validateSeatSpacing(selectedSeatIds, allSeats) {
  const selected = new Set(selectedSeatIds.map(String));
  const rows = new Map();
  for (const seat of allSeats) {
    if (!rows.has(seat.row)) rows.set(seat.row, []);
    rows.get(seat.row).push(seat);
  }
  const isSelected = (seat) => selected.has(String(seat.id));
  const isEmpty = (seat) => seat.status === "available" && !isSelected(seat);
  const regular = (seat) => seat.type !== "couple";
  const adjacent = (left, right) => Number(right.number) === Number(left.number) + 1;
  for (const row of rows.values()) {
    const seats = [...row].sort((a, b) => a.number - b.number);
    if (seats.length >= 2) {
      const first = seats[0], second = seats[1];
      const last = seats.at(-1), beforeLast = seats.at(-2);
      if ((regular(first) && regular(second) && adjacent(first, second) && isEmpty(first) && isSelected(second))
        || (regular(last) && regular(beforeLast) && adjacent(beforeLast, last) && isEmpty(last) && isSelected(beforeLast))) {
        return "Không được để trống một ghế lẻ ở ngoài cùng của hàng.";
      }
    }
    for (let index = 1; index < seats.length - 1; index += 1) {
      const left = seats[index - 1], middle = seats[index], right = seats[index + 1];
      if ([left, middle, right].every(regular) && adjacent(left, middle) && adjacent(middle, right)
        && isSelected(left) && isEmpty(middle) && isSelected(right)) {
        return "Không được chọn hai ghế cách nhau đúng một ghế trống.";
      }
    }
  }
  return "";
}
