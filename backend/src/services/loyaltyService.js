import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Voucher from "../models/Voucher.js";
import UserVoucher from "../models/UserVoucher.js";
import RewardOffer from "../models/RewardOffer.js";
import RewardPointLog from "../models/RewardPointLog.js";
import VoucherGrant from "../models/VoucherGrant.js";
import { membershipView } from "./loyaltyPolicy.js";
import { withTransaction } from "./transactionService.js";

export const loyaltyError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const validId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) throw loyaltyError("ID không hợp lệ.");
  return id;
};
export const requestKey = (key) => {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(String(key || ""))) throw loyaltyError("Thiếu mã yêu cầu hợp lệ.");
  return key;
};
const activeUsers = { role: "user", status: true, account_status: "active", deleted_at: null };

export const getMembership = async (userId) => {
  // Persist the identifier for pre-existing accounts without replacing one already issued.
  await User.updateOne({ _id: userId, member_code: null, status: true, account_status: "active" }, { $set: {
    member_code: `AMC${randomBytes(8).toString("hex").toUpperCase()}`,
    member_activated_at: new Date(),
  } });
  const user = await User.findById(userId).lean();
  if (!user) throw loyaltyError("Không tìm thấy tài khoản.", 404);
  return { ...membershipView(user), redemption_enabled: process.env.LOYALTY_REDEMPTION_ENABLED === "true" && Boolean(user.loyalty_reconciled_at) };
};

export const walletState = (item, template, now = new Date()) => {
  if (item.status === "used") return "used";
  const expiry = item.expires_at || item.snapshot?.end_date || template?.end_date;
  if (item.status === "expired" || (expiry && new Date(expiry) <= now)) return "expired";
  if (item.status === "reserved") return "reserved";
  if (!item.snapshot || !item.code || item.requires_review) return "paused";
  if (!template || template.deleted_at || !template.status) return "paused";
  if (new Date(item.snapshot?.start_date || template.start_date) > now) return "upcoming";
  return "available";
};

export const getWallet = async (userId) => {
  const items = await UserVoucher.find({ user_id: userId }).populate("voucher_id").sort({ created_at: -1 }).lean();
  return items.map((item) => ({
    id: item._id, status: walletState(item, item.voucher_id), source: item.source,
    used_at: item.used_at, expires_at: item.expires_at, received_at: item.created_at,
    booking_id: item.booking_id,
    voucher: { ...(item.snapshot || item.voucher_id || {}), id: item.voucher_id?._id, code: item.code || "" },
  }));
};

export const getPointHistory = async (userId, query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const filter = { user_id: userId };
  if (query.type && !["earn", "redeem", "add", "subtract"].includes(query.type)) throw loyaltyError("Loại giao dịch không hợp lệ.");
  if (query.type) filter.type = query.type;
  const [data, total] = await Promise.all([
    RewardPointLog.find(filter).sort({ occurred_at: -1, _id: -1 }).skip((page - 1) * 10).limit(10)
      .populate("booking_id", "booking_code").populate("user_voucher_id", "code").lean(),
    RewardPointLog.countDocuments(filter),
  ]);
  return { data, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / 10)) } };
};

export const listRewardOffers = async (admin = false) => {
  const offers = await RewardOffer.find(admin ? {} : { active: true }).populate("voucher_id").sort({ created_at: -1 }).lean();
  return offers.filter((offer) => offer.voucher_id).map((offer) => ({
    ...offer, remaining: Math.max(0, Number(offer.voucher_id.quantity || 0)),
    available: offer.active && offer.voucher_id.status && !offer.voucher_id.deleted_at && new Date(offer.voucher_id.end_date) > new Date() && offer.voucher_id.quantity > 0,
  }));
};

export const saveRewardOffer = async (body) => {
  validId(body.voucher_id);
  const points = Number(body.points_cost);
  if (!Number.isSafeInteger(points) || points < 1) throw loyaltyError("Giá điểm phải là số nguyên dương.");
  if (typeof body.active !== "boolean") throw loyaltyError("Trạng thái phần thưởng không hợp lệ.");
  if (!await Voucher.exists({ _id: body.voucher_id, deleted_at: null })) throw loyaltyError("Không tìm thấy chương trình voucher.", 404);
  return withTransaction(async session => {
    await Voucher.updateOne({ _id: body.voucher_id }, { $set: { personal_only: true } }, { session });
    return RewardOffer.findOneAndUpdate({ voucher_id: body.voucher_id }, { $set: { points_cost: points, active: body.active } }, { new: true, upsert: true, runValidators: true, session });
  });
};

const allocateVoucher = async ({ voucherId, userId, source, issueKey, adminId, session }) => {
  // Stock is allocated at issuance; checkout only consumes the owned entitlement.
  const template = await Voucher.findOneAndUpdate({
    _id: voucherId, deleted_at: null, status: true, quantity: { $gt: 0 }, end_date: { $gt: new Date() },
  }, { $inc: { quantity: -1, allocated_count: 1 }, $set: { personal_only: true } }, { new: true, session });
  if (!template) throw loyaltyError("Voucher đã hết số lượng, hết hạn hoặc tạm ngừng.", 409);
  const snapshot = template.toObject();
  delete snapshot.created_by;
  delete snapshot.updated_by;
  const [item] = await UserVoucher.create([{
    user_id: userId, voucher_id: voucherId, source, issue_key: issueKey,
    issued_by: adminId || null, snapshot, expires_at: template.end_date,
  }], { session });
  return item;
};

export const redeemReward = async (userId, offerId, key) => {
  validId(offerId); requestKey(key);
  if (process.env.LOYALTY_REDEMPTION_ENABLED !== "true") throw loyaltyError("Đổi thưởng chưa được mở.", 409);
  return withTransaction(async (session) => {
    const eventKey = `redeem:${userId}:${key}`;
    const existing = await UserVoucher.findOne({ issue_key: eventKey }).session(session);
    const offer = await RewardOffer.findById(offerId).session(session);
    if (existing) {
      if (!offer || String(existing.voucher_id) !== String(offer.voucher_id)) throw loyaltyError("Mã yêu cầu đã được dùng cho phần thưởng khác.", 409);
      return existing;
    }
    if (!offer?.active) throw loyaltyError("Phần thưởng không còn khả dụng.", 409);
    const user = await User.findOneAndUpdate({
      _id: userId, ...activeUsers, loyalty_reconciled_at: { $ne: null }, reward_points: { $gte: offer.points_cost },
    }, { $inc: { reward_points: -offer.points_cost } }, { new: true, session });
    if (!user) throw loyaltyError("Không đủ điểm khả dụng hoặc tài khoản chưa được đối soát.", 409);
    const item = await allocateVoucher({ voucherId: offer.voucher_id, userId, source: "redeem", issueKey: eventKey, session });
    await RewardPointLog.create([{
      user_id: userId, user_voucher_id: item._id, type: "redeem", event_key: eventKey,
      points: offer.points_cost, balance_after: user.reward_points, reason: `Đổi voucher ${item.code}`,
    }], { session });
    return item;
  });
};

export const previewGrant = async (adminId, body) => {
  validId(body.voucher_id); requestKey(body.key);
  if (Boolean(body.email) === Boolean(body.tier)) throw loyaltyError("Chọn email hoặc nhóm hạng.");
  const filter = { ...activeUsers };
  if (body.email) filter.email = String(body.email).trim().toLowerCase();
  if (body.tier) {
    if (!["member", "vip", "vvip"].includes(body.tier)) throw loyaltyError("Hạng không hợp lệ.");
    filter.total_spent = body.tier === "member" ? { $lt: 3000000 } : body.tier === "vip" ? { $gte: 3000000, $lt: 10000000 } : { $gte: 10000000 };
  }
  const request = JSON.stringify({ voucher_id: body.voucher_id, email: filter.email || "", tier: body.tier || "" });
  const previous = await VoucherGrant.findOne({ key: body.key, admin_id: adminId });
  if (previous) {
    if (previous.request !== request) throw loyaltyError("Mã yêu cầu đã được sử dụng.", 409);
    return { id: previous._id, count: previous.user_ids.length, completed_at: previous.completed_at };
  }
  const users = await User.find(filter).select("_id").limit(501).lean();
  if (!users.length) throw loyaltyError("Không có người nhận phù hợp.");
  if (users.length > 500) throw loyaltyError("Mỗi đợt cấp tối đa 500 thành viên.");
  const template = await Voucher.findOne({ _id: body.voucher_id, status: true, deleted_at: null, end_date: { $gt: new Date() } });
  if (!template || template.quantity < users.length) throw loyaltyError("Chương trình không đủ voucher khả dụng.", 409);
  const grant = await VoucherGrant.create({ key: body.key, admin_id: adminId, voucher_id: template._id, user_ids: users.map(u => u._id), request });
  return { id: grant._id, count: users.length, completed_at: null };
};

export const confirmGrant = (adminId, id) => {
  validId(id);
  return withTransaction(async (session) => {
    const grant = await VoucherGrant.findOne({ _id: id, admin_id: adminId }).session(session);
    if (!grant) throw loyaltyError("Không tìm thấy đợt cấp.", 404);
    if (grant.completed_at) return grant;
    for (const userId of grant.user_ids) {
      if (!await User.exists({ _id: userId, ...activeUsers }).session(session)) throw loyaltyError("Danh sách người nhận đã thay đổi. Hãy tạo đợt cấp mới.", 409);
      await allocateVoucher({ voucherId: grant.voucher_id, userId, source: "admin", issueKey: `grant:${grant._id}:${userId}`, adminId, session });
    }
    grant.completed_at = new Date();
    await grant.save({ session });
    return grant;
  });
};

export const grantHistory = async (pageValue) => {
  const page = Math.max(1, Number.parseInt(pageValue, 10) || 1);
  const filter = { completed_at: { $ne: null } };
  const [items, total] = await Promise.all([
    VoucherGrant.find(filter).populate("voucher_id", "name code").populate("admin_id", "full_name").sort({ completed_at: -1 }).skip((page - 1) * 10).limit(10).lean(),
    VoucherGrant.countDocuments(filter),
  ]);
  return { data: items.map(({ user_ids, ...item }) => ({ ...item, count: user_ids.length })), pagination: { page, totalPages: Math.max(1, Math.ceil(total / 10)) } };
};
