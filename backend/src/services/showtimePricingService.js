export const SHOWTIME_PRICING_MODES = ["standard", "custom"];
export const SHOWTIME_DAY_TYPES = ["weekday", "weekend", "holiday"];
export const STANDARD_PRICING_RULE_VERSION = "2026-09-v1";
export const CINEMA_TIME_ZONE = "Asia/Ho_Chi_Minh";

const VIP_SEAT_SURCHARGE = 20000;
const COUPLE_SEAT_SURCHARGE = 20000;
const STANDARD_TICKET_PRICES = {
  "2D": { weekday: 50000, weekend: 70000, holiday: 80000 },
  "3D": { weekday: 50000, weekend: 70000, holiday: 80000 },
};
const FIXED_HOLIDAYS = new Set(["01-01", "04-30", "05-01", "09-02"]);

const makePricingError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const isEmptyValue = (value) =>
  value === undefined || value === null || value === "";

const parsePrice = (value, fieldName) => {
  if (isEmptyValue(value)) return null;

  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw makePricingError(`${fieldName} khong hop le`);
  }

  return price;
};

const normalizeSeatPrices = (seatPrices) => {
  if (seatPrices === undefined) return undefined;
  if (!seatPrices || typeof seatPrices !== "object") {
    return { normal: null, vip: null, couple: null };
  }

  return {
    normal: parsePrice(seatPrices.normal, "seat_prices.normal"),
    vip: parsePrice(seatPrices.vip, "seat_prices.vip"),
    couple: parsePrice(seatPrices.couple, "seat_prices.couple"),
  };
};

const getZonedDateParts = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw makePricingError("start_time khong hop le");
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CINEMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
    return parts;
  }, {});
};

export const getShowtimeDayType = (dateValue) => {
  const parts = getZonedDateParts(dateValue);
  const monthDay = `${parts.month}-${parts.day}`;

  if (FIXED_HOLIDAYS.has(monthDay)) return "holiday";
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return "weekend";
  return "weekday";
};

export const getShowtimeLocalDate = (dateValue) => {
  const parts = getZonedDateParts(dateValue);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const buildStandardSeatPrices = (basePrice) => ({
  normal: basePrice,
  vip: basePrice + VIP_SEAT_SURCHARGE,
  couple: basePrice * 2 + COUPLE_SEAT_SURCHARGE,
});

export const resolveStandardShowtimePricing = ({ room, startTime }) => {
  const roomType = String(room?.room_type || "2D").toUpperCase();
  const priceTable =
    STANDARD_TICKET_PRICES[roomType] || STANDARD_TICKET_PRICES["2D"];
  const dayType = getShowtimeDayType(startTime);
  const basePrice = priceTable[dayType];

  return {
    pricing_mode: "standard",
    pricing_day_type: dayType,
    pricing_rule_version: STANDARD_PRICING_RULE_VERSION,
    base_price: basePrice,
    seat_prices: buildStandardSeatPrices(basePrice),
  };
};

export const normalizeShowtimePricingMode = (
  value,
  { basePrice, seatPrices } = {},
) => {
  if (isEmptyValue(value)) {
    const hasExplicitSeatPrice =
      seatPrices &&
      typeof seatPrices === "object" &&
      Object.values(seatPrices).some((price) => !isEmptyValue(price));
    return !isEmptyValue(basePrice) || hasExplicitSeatPrice
      ? "custom"
      : "standard";
  }

  const mode = String(value).trim().toLowerCase();
  if (!SHOWTIME_PRICING_MODES.includes(mode)) {
    throw makePricingError("pricing_mode khong hop le");
  }

  return mode;
};

export const resolveShowtimePricingSnapshot = ({
  pricingMode,
  basePrice,
  seatPrices,
  room,
  startTime,
}) => {
  const mode = normalizeShowtimePricingMode(pricingMode, {
    basePrice,
    seatPrices,
  });
  const standardPricing = resolveStandardShowtimePricing({ room, startTime });

  if (mode === "standard") return standardPricing;

  const parsedBasePrice = parsePrice(basePrice, "base_price");
  const normalizedSeatPrices = normalizeSeatPrices(seatPrices);
  const normalPrice = normalizedSeatPrices?.normal ?? parsedBasePrice;

  if (normalPrice === null) {
    throw makePricingError("Gia ghe thuong la bat buoc khi dung gia ngoai le");
  }

  const derivedSeatPrices = buildStandardSeatPrices(normalPrice);

  return {
    pricing_mode: "custom",
    pricing_day_type: standardPricing.pricing_day_type,
    pricing_rule_version: null,
    base_price: parsedBasePrice ?? normalPrice,
    seat_prices: {
      normal: normalPrice,
      vip: normalizedSeatPrices?.vip ?? derivedSeatPrices.vip,
      couple: normalizedSeatPrices?.couple ?? derivedSeatPrices.couple,
    },
  };
};
