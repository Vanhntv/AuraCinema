import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Gift from "../models/Gift.js";
import RewardOffer from "../models/RewardOffer.js";

await connectDB();

for (const gift of await Gift.find({})) {
  const modes = gift.acquisition_modes?.length
    ? gift.acquisition_modes
    : Number(gift.condition?.point_required || 0) > 0 ? ["points"] : ["manual"];
  const benefit = gift.benefit && Object.keys(gift.benefit).length ? gift.benefit :
    gift.type === "ticket" ? { quantity: 1, max_unit_price: Number(gift.value || 0), seat_types: [] } :
    gift.type === "combo" ? { combo_id: gift.condition?.combo_ids?.[0] || null, quantity: 1 } :
    gift.type === "voucher" ? { voucher_id: gift.condition?.voucher_id || null } :
    gift.type === "point" ? { points: Number(gift.value || 0) } : { label: gift.value_label || gift.name };
  const invalidReference = ["combo", "voucher"].includes(gift.type) && !Object.values(benefit).some((value) => value && mongoose.isObjectIdOrHexString(value));
  await Gift.updateOne({ _id: gift._id }, { $set: {
    acquisition_modes: modes,
    trigger: gift.trigger || "none",
    redemption_channel: gift.redemption_channel || (["combo", "physical"].includes(gift.type) ? "counter" : ["point", "voucher"].includes(gift.type) ? "instant" : "online"),
    max_per_user: gift.max_per_user || 1,
    benefit,
    remaining_quantity: Math.max(Number(gift.quantity || 0) - Number(gift.issued_quantity || 0), 0),
    ...(invalidReference ? { status: "draft" } : {}),
  } });
}

for (const offer of await RewardOffer.find({}).populate("voucher_id")) {
  if (!offer.voucher_id) continue;
  const voucher = offer.voucher_id;
  await Gift.updateOne({ code: `REWARD-${voucher.code}` }, { $setOnInsert: {
    name: voucher.name || `Voucher ${voucher.code}`,
    description: voucher.description || "Phần thưởng chuyển đổi từ danh mục voucher.",
    image_url: voucher.image_url || "",
    type: "voucher",
    acquisition_modes: ["points"],
    trigger: "none",
    redemption_channel: "instant",
    max_per_user: 1,
    benefit: { voucher_id: voucher._id },
    value: Number(voucher.discount_value || 0),
    value_label: voucher.name || voucher.code,
    quantity: Math.max(Number(voucher.quantity || 0), 1),
    issued_quantity: 0,
    remaining_quantity: Math.max(Number(voucher.quantity || 0), 1),
    condition: { min_order: Number(voucher.min_order || 0), point_required: offer.points_cost },
    start_date: voucher.start_date,
    end_date: voucher.end_date,
    status: offer.active ? "active" : "draft",
  } }, { upsert: true });
}

await mongoose.disconnect();
console.log("Đã chuyển đổi cấu hình quà tặng.");
