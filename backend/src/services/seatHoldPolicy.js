export const SEAT_HOLD_DURATION_MS = 5 * 60 * 1000;
export const PAYMENT_DURATION_MS = 5 * 60 * 1000;
export const MAX_SEATS_PER_HOLD = 8;

const addDuration = (now, durationMs) =>
  new Date(new Date(now).getTime() + durationMs);

export const createSeatHoldExpiry = (now = new Date()) =>
  addDuration(now, SEAT_HOLD_DURATION_MS);

export const createPaymentExpiry = (now = new Date()) =>
  addDuration(now, PAYMENT_DURATION_MS);

export const isExpired = (expiresAt, now = new Date()) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= new Date(now).getTime();
};

const normalizeTypeName = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/đ/g, "d");

export const validateCoupleSeatSelection = (seats = []) => {
  const coupleSeatsByRow = new Map();

  for (const seat of seats) {
    const typeName = normalizeTypeName(seat?.seat_id?.seat_type_id?.name);
    if (!typeName.includes("doi") && !typeName.includes("couple") && !typeName.includes("double")) {
      continue;
    }
    const row = String(seat?.seat_id?.seat_row || "");
    if (!coupleSeatsByRow.has(row)) coupleSeatsByRow.set(row, []);
    coupleSeatsByRow.get(row).push(Number(seat?.seat_id?.seat_number));
  }

  for (const numbers of coupleSeatsByRow.values()) {
    numbers.sort((first, second) => first - second);
    if (numbers.length % 2 !== 0) {
      throw Object.assign(new Error("Ghế đôi phải được chọn đủ cặp liền kề"), { statusCode: 409 });
    }
    for (let index = 0; index < numbers.length; index += 2) {
      if (numbers[index + 1] !== numbers[index] + 1) {
        throw Object.assign(new Error("Ghế đôi phải được chọn đủ cặp liền kề"), { statusCode: 409 });
      }
    }
  }
};
