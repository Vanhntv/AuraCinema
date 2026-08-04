import SeatType from "../models/SeatType.js";

export const REQUIRED_SEAT_TYPES = [
  {
    key: "normal",
    name: "Thuong",
    description: "Ghe thuong mac dinh",
    price_multiplier: 1,
  },
  {
    key: "vip",
    name: "VIP",
    description: "Ghe VIP",
    price_multiplier: 1.2,
  },
  {
    key: "couple",
    name: "Couple",
    description: "Ghe doi danh cho 2 khach",
    price_multiplier: 1.8,
  },
  {
    key: "broken",
    name: "Ghe hong",
    description: "Ghe hong khong the ban ve",
    price_multiplier: 0,
  },
];

export const normalizeSeatTypeName = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const resolveSeatTypeTone = (seatType) => {
  const name = normalizeSeatTypeName(seatType?.name);

  if (!name) return "normal";
  if (name.includes("hong") || name.includes("broken")) return "broken";
  if (name.includes("vip")) return "vip";
  if (name.includes("couple") || name.includes("doi") || name.includes("double")) return "couple";
  return "normal";
};

export const isBrokenSeatType = (seatType) => resolveSeatTypeTone(seatType) === "broken";

export const isSellableSeatType = (seatType) => !isBrokenSeatType(seatType);

export const ensureCoreSeatTypes = async () => {
  const existingSeatTypes = await SeatType.find().select("name description price_multiplier");

  const requiredByTone = new Map(REQUIRED_SEAT_TYPES.map((item) => [item.key, item]));
  const existingTones = new Set(existingSeatTypes.map((seatType) => resolveSeatTypeTone(seatType)));
  const createdSeatTypes = [];

  for (const required of REQUIRED_SEAT_TYPES) {
    if (existingTones.has(required.key)) {
      continue;
    }

    const createdSeatType = await SeatType.create({
      name: required.key === "normal" ? "Thuong" : required.name,
      description: required.description,
      price_multiplier: required.price_multiplier,
    });

    createdSeatTypes.push(createdSeatType);
    existingTones.add(required.key);
  }

  return {
    existingSeatTypes,
    createdSeatTypes,
  };
};
