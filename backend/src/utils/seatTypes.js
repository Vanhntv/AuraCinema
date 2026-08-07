import SeatType from "../models/SeatType.js";
import Seat from "../models/Seat.js";

export const REQUIRED_SEAT_TYPES = [
  {
    key: "broken",
    name: "Ghế hỏng",
    description: "Ghế hỏng không thể bán vé",
    price_multiplier: 0,
  },
  {
    key: "normal",
    name: "Ghế thường",
    description: "Ghế thường mặc định",
    price_multiplier: 1,
  },
  {
    key: "vip",
    name: "VIP",
    description: "Ghế VIP",
    price_multiplier: 1.2,
  },
  {
    key: "couple",
    name: "Ghế đôi",
    description: "Ghế đôi dành cho 2 khách",
    price_multiplier: 1.8,
  },
];

export const normalizeSeatTypeName = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
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
  const existingSeatTypes = await SeatType.find()
    .select("name description price_multiplier")
    .sort({ created_at: 1 });
  const createdSeatTypes = [];
  const canonicalSeatTypes = [];
  const removedSeatTypeIds = [];

  for (const required of REQUIRED_SEAT_TYPES) {
    const matchingSeatTypes = existingSeatTypes.filter(
      (seatType) => resolveSeatTypeTone(seatType) === required.key,
    );
    const canonicalName = normalizeSeatTypeName(required.name);
    let canonicalSeatType =
      matchingSeatTypes.find(
        (seatType) => normalizeSeatTypeName(seatType.name) === canonicalName,
      ) || matchingSeatTypes[0];

    if (!canonicalSeatType) {
      canonicalSeatType = await SeatType.create({
        name: required.name,
        description: required.description,
        price_multiplier: required.price_multiplier,
      });
      existingSeatTypes.push(canonicalSeatType);
      createdSeatTypes.push(canonicalSeatType);
    } else {
      let shouldSave = false;

      if (canonicalSeatType.name !== required.name) {
        canonicalSeatType.name = required.name;
        shouldSave = true;
      }

      if (!canonicalSeatType.description) {
        canonicalSeatType.description = required.description;
        shouldSave = true;
      }

      if (shouldSave) {
        await canonicalSeatType.save();
      }
    }

    const duplicateSeatTypes = matchingSeatTypes.filter(
      (seatType) => !seatType._id.equals(canonicalSeatType._id),
    );

    if (duplicateSeatTypes.length > 0) {
      const duplicateIds = duplicateSeatTypes.map((seatType) => seatType._id);

      await Seat.updateMany(
        { seat_type_id: { $in: duplicateIds } },
        { $set: { seat_type_id: canonicalSeatType._id } },
      );
      await SeatType.deleteMany({ _id: { $in: duplicateIds } });
      removedSeatTypeIds.push(...duplicateIds);
    }

    canonicalSeatTypes.push(canonicalSeatType);
  }

  return {
    existingSeatTypes,
    createdSeatTypes,
    seatTypes: canonicalSeatTypes,
    removedSeatTypeIds,
  };
};
