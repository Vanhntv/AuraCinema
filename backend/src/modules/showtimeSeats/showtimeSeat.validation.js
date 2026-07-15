const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const normalizeShowtimeSeatPayload = (payload, defaults = {}) => {
  return {
    showtime_id: payload.showtime_id ?? defaults.showtime_id,
    seat_id: payload.seat_id ?? defaults.seat_id,
    price: payload.price ?? defaults.price,
    status: payload.status ?? defaults.status,
  };
};

export const parseShowtimeSeatStatus = (value, fallback = "available") => {
  if (isEmptyValue(value)) {
    return fallback;
  }

  return String(value).trim();
};

export const validateShowtimeSeatPayload = (showtimeSeat, index = null) => {
  const prefix = index === null ? "" : `Showtime seat ${index + 1}: `;

  if (isEmptyValue(showtimeSeat.showtime_id)) {
    return `${prefix}showtime_id la bat buoc`;
  }

  if (isEmptyValue(showtimeSeat.seat_id)) {
    return `${prefix}seat_id la bat buoc`;
  }

  if (isEmptyValue(showtimeSeat.price)) {
    return `${prefix}price la bat buoc`;
  }

  const priceValue = Number(showtimeSeat.price);

  if (Number.isNaN(priceValue)) {
    return `${prefix}price khong hop le`;
  }

  if (priceValue < 0) {
    return `${prefix}price khong duoc am`;
  }

  if (!isEmptyValue(showtimeSeat.status) && typeof showtimeSeat.status !== "string") {
    return `${prefix}status khong hop le`;
  }

  return null;
};
