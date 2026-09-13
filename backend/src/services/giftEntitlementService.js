import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Gift from "../models/Gift.js";
import GiftGrant from "../models/GiftGrant.js";
import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";
import UserGift from "../models/UserGift.js";
import { allocateVoucher, loyaltyError, requestKey, validId } from "./loyaltyService.js";
import { requireTransaction, withTransaction } from "./transactionService.js";
import { decryptQrToken, encryptQrToken, hashQrToken } from "./ticketService.js";

const ACTIVE_USER = { role: "user", status: true, account_status: "active", deleted_at: null };
const GIFT_QR_PREFIX = "AURA_GIFT:";
const COUNTER_TYPES = new Set(["combo", "physical"]);

const asObject = (value) => typeof value?.toObject === "function" ? value.toObject() : { ...value };
const activeWindow = (now = new Date()) => ({
  status: "active",
  is_deleted: { $ne: true },
  deleted_at: null,
  start_date: { $lte: now },
  end_date: { $gt: now },
  remaining_quantity: { $gt: 0 },
});
const modesOf = (gift) => gift.acquisition_modes?.length
  ? gift.acquisition_modes
  : Number(gift.condition?.point_required || 0) > 0 ? ["points"] : ["manual"];
const benefitOf = (gift) => {
  if (gift.benefit && Object.keys(gift.benefit).length) return gift.benefit;
  if (gift.type === "point") return { points: Number(gift.value || 0) };
  if (gift.type === "voucher") return { voucher_id: gift.condition?.voucher_id || null, value: Number(gift.value || 0) };
  if (gift.type === "ticket") return { quantity: 1, max_unit_price: Number(gift.value || 0), seat_types: [] };
  if (gift.type === "combo") return { combo_id: gift.condition?.combo_ids?.[0] || null, quantity: 1 };
  return { label: gift.value_label || gift.name };
};
const expiryFor = (gift, now = new Date()) => {
  const campaignEnd = new Date(gift.end_date);
  if (!gift.validity_days) return campaignEnd;
  const rollingEnd = new Date(now.getTime() + Number(gift.validity_days) * 86400000);
  return rollingEnd < campaignEnd ? rollingEnd : campaignEnd;
};
const snapshotOf = (gift) => {
  const data = asObject(gift);
  return {
    gift_id: data._id,
    code: data.code,
    name: data.name,
    description: data.description,
    image_url: data.image_url,
    type: data.type,
    value: Number(data.value || 0),
    value_label: data.value_label,
    benefit: benefitOf(data),
    condition: data.condition || {},
    redemption_channel: data.redemption_channel || (COUNTER_TYPES.has(data.type) ? "counter" : "online"),
    start_date: data.start_date,
    end_date: data.end_date,
  };
};

export const buildGiftQrPayload = (token) => `${GIFT_QR_PREFIX}${String(token || "").trim()}`;
export const parseGiftQrPayload = (payload) => {
  const value = String(payload || "").trim();
  return value.startsWith(GIFT_QR_PREFIX) && value.length <= 512 ? value.slice(GIFT_QR_PREFIX.length) : "";
};

export const issueGiftInTransaction = async ({ giftId, userId, source, issueKey, adminId = null, session }) => {
  requireTransaction(session);
  const existing = await UserGift.findOne({ issue_key: issueKey }).session(session);
  if (existing) {
    if (String(existing.gift_id) !== String(giftId) || String(existing.user_id) !== String(userId)) {
      throw loyaltyError("Mã yêu cầu đã được dùng cho quà tặng khác.", 409);
    }
    return existing;
  }

  const template = await Gift.findOne({ _id: giftId, ...activeWindow() }).session(session);
  if (!template) throw loyaltyError("Quà đã hết số lượng, hết hạn hoặc tạm ngừng.", 409);
  const maxPerUser = Math.max(Number(template.max_per_user || 1), 1);
  const issuedCount = await UserGift.countDocuments({ user_id: userId, gift_id: giftId }).session(session);
  if (issuedCount >= maxPerUser) throw loyaltyError("Bạn đã nhận đủ số lượt của chương trình này.", 409);

  const allocated = await Gift.findOneAndUpdate(
    { _id: giftId, ...activeWindow() },
    { $inc: { issued_quantity: 1, remaining_quantity: -1 } },
    { new: true, session },
  );
  if (!allocated) throw loyaltyError("Quà vừa hết số lượng.", 409);

  const snapshot = snapshotOf(template);
  const qrToken = COUNTER_TYPES.has(template.type) ? randomBytes(32).toString("base64url") : "";
  const [owned] = await UserGift.create([{
    user_id: userId,
    gift_id: giftId,
    source,
    issue_key: issueKey,
    issue_slot: issuedCount + 1,
    snapshot,
    issued_by: adminId,
    expires_at: expiryFor(template),
    status: ["point", "voucher"].includes(template.type) ? "fulfilled" : "available",
    qr_token_hash: qrToken ? hashQrToken(qrToken) : "",
    qr_token_encrypted: qrToken ? encryptQrToken(qrToken) : "",
  }], { session });

  if (template.type === "point") {
    const points = Number(snapshot.benefit.points || 0);
    if (!Number.isSafeInteger(points) || points < 1) throw loyaltyError("Quà điểm chưa được cấu hình hợp lệ.", 409);
    const user = await User.findOneAndUpdate(
      { _id: userId, ...ACTIVE_USER },
      { $inc: { reward_points: points } },
      { new: true, session },
    );
    if (!user) throw loyaltyError("Không tìm thấy người nhận hợp lệ.", 404);
    const [log] = await RewardPointLog.create([{
      user_id: userId,
      user_gift_id: owned._id,
      event_key: `gift-points:${owned._id}`,
      type: "add",
      points,
      balance_after: user.reward_points,
      reason: `Nhận quà ${template.name}`,
    }], { session });
    owned.reward_point_log_id = log._id;
    await owned.save({ session });
  }

  if (template.type === "voucher") {
    const voucherId = snapshot.benefit.voucher_id;
    if (!voucherId) throw loyaltyError("Quà voucher chưa liên kết chương trình voucher.", 409);
    const voucher = await allocateVoucher({
      voucherId,
      userId,
      source: "gift",
      issueKey: `gift-voucher:${owned._id}`,
      adminId,
      session,
    });
    owned.linked_user_voucher_id = voucher._id;
    await owned.save({ session });
  }

  return owned;
};

export const redeemGift = (userId, giftId, key) => {
  validId(giftId);
  requestKey(key);
  if (process.env.LOYALTY_REDEMPTION_ENABLED !== "true") throw loyaltyError("Đổi thưởng chưa được mở.", 409);
  return withTransaction(async (session) => {
    const eventKey = `gift-redeem:${userId}:${key}`;
    const existing = await UserGift.findOne({ issue_key: eventKey }).session(session);
    if (existing) return existing;
    const gift = await Gift.findOne({ _id: giftId, ...activeWindow(), acquisition_modes: "points" }).session(session);
    if (!gift) throw loyaltyError("Phần thưởng không còn khả dụng.", 409);
    const cost = Number(gift.condition?.point_required || 0);
    if (!Number.isSafeInteger(cost) || cost < 1) throw loyaltyError("Giá điểm của quà chưa hợp lệ.", 409);
    const user = await User.findOneAndUpdate(
      { _id: userId, ...ACTIVE_USER, loyalty_reconciled_at: { $ne: null }, reward_points: { $gte: cost } },
      { $inc: { reward_points: -cost } },
      { new: true, session },
    );
    if (!user) throw loyaltyError("Không đủ điểm khả dụng hoặc tài khoản chưa được đối soát.", 409);
    const owned = await issueGiftInTransaction({ giftId, userId, source: "points", issueKey: eventKey, session });
    await RewardPointLog.create([{
      user_id: userId,
      user_gift_id: owned._id,
      event_key: eventKey,
      type: "redeem",
      points: cost,
      balance_after: user.reward_points,
      reason: `Đổi quà ${gift.name}`,
    }], { session });
    return owned;
  });
};

export const listGiftCatalog = async (userId) => {
  const gifts = await Gift.find({ ...activeWindow(), acquisition_modes: "points" }).sort({ created_at: -1 }).lean();
  const counts = await UserGift.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), gift_id: { $in: gifts.map((item) => item._id) } } },
    { $group: { _id: "$gift_id", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  return gifts.map((gift) => ({
    ...gift,
    benefit: benefitOf(gift),
    points_cost: Number(gift.condition?.point_required || 0),
    received_count: countMap.get(String(gift._id)) || 0,
    available: (countMap.get(String(gift._id)) || 0) < Number(gift.max_per_user || 1),
  }));
};

const walletStatus = (item, now = new Date()) => item.status === "available" && new Date(item.expires_at) <= now
  ? "expired"
  : item.status;

export const getGiftWallet = async (userId, query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 50);
  await UserGift.updateMany(
    { user_id: userId, status: "available", expires_at: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
  const filter = { user_id: userId };
  if (["available", "reserved", "used", "fulfilled", "expired"].includes(query.status)) filter.status = query.status;
  const [items, total] = await Promise.all([
    UserGift.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    UserGift.countDocuments(filter),
  ]);
  return {
    data: items.map((item) => ({ ...item, id: item._id, status: walletStatus(item) })),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  };
};

const conditionsMatch = ({ gift, user, movieId, orderAmount, comboIds = [] }) => {
  const condition = gift.condition || {};
  if (Number(condition.min_order || 0) > Number(orderAmount || 0)) return false;
  if (condition.member_tiers?.length && !condition.member_tiers.includes(user.member_tier)) return false;
  if (condition.movie_ids?.length && !condition.movie_ids.map(String).includes(String(movieId || ""))) return false;
  if (condition.combo_required && !comboIds.length) return false;
  if (condition.combo_ids?.length && !condition.combo_ids.some((id) => comboIds.map(String).includes(String(id)))) return false;
  if (condition.birthday && (!user.birth_date || new Date(user.birth_date).getMonth() !== new Date().getMonth())) return false;
  return true;
};

export const listEligibleGifts = async (userId, context = {}) => {
  const user = await User.findOne({ _id: userId, ...ACTIVE_USER }).lean();
  if (!user) throw loyaltyError("Không tìm thấy tài khoản.", 404);
  const items = await UserGift.find({ user_id: userId, status: "available", expires_at: { $gt: new Date() } }).lean();
  return items.filter((item) => ["ticket", "combo"].includes(item.snapshot?.type))
    .filter((item) => ["online", "both"].includes(item.snapshot?.redemption_channel))
    .filter((item) => conditionsMatch({ gift: item.snapshot, user, movieId: context.movie_id, orderAmount: context.order_amount, comboIds: context.combo_ids || [] }))
    .map((item) => ({ id: item._id, code: item.code, expires_at: item.expires_at, gift: item.snapshot }));
};

export const appendGiftComboToOrder = async ({ userGiftId, userId, combos, session }) => {
  if (!userGiftId) return combos;
  const item = await UserGift.findOne({ _id: userGiftId, user_id: userId, status: "available", expires_at: { $gt: new Date() } }).session(session);
  if (!item || item.snapshot?.type !== "combo" || !["online", "both"].includes(item.snapshot?.redemption_channel)) return combos;
  const comboId = item.snapshot.benefit?.combo_id;
  const quantity = Math.max(Number(item.snapshot.benefit?.quantity || 1), 1);
  if (!comboId) throw loyaltyError("Quà combo chưa được cấu hình hợp lệ.", 409);
  const next = combos.map((entry) => ({ ...entry }));
  const existing = next.find((entry) => String(entry.combo_id) === String(comboId));
  if (existing) existing.quantity += quantity;
  else next.push({ combo_id: comboId, quantity });
  return next;
};

export const getMyGiftQr = async (userId, id) => {
  validId(id);
  const item = await UserGift.findOne({ _id: id, user_id: userId, status: "available", expires_at: { $gt: new Date() } })
    .select("+qr_token_encrypted");
  if (!item || !item.qr_token_encrypted) throw loyaltyError("Quà không có QR khả dụng.", 404);
  return { code: item.code, qrPayload: buildGiftQrPayload(decryptQrToken(item.qr_token_encrypted)) };
};

export const reserveGiftForBooking = async ({ userGiftId, userId, bookingId, session }) => {
  requireTransaction(session);
  const item = await UserGift.findOneAndUpdate(
    { _id: userGiftId, user_id: userId, status: "available", expires_at: { $gt: new Date() } },
    { $set: { status: "reserved", booking_id: bookingId, reserved_at: new Date() } },
    { new: true, session },
  );
  if (!item) throw loyaltyError("Quà không còn khả dụng.", 409);
  return item;
};

export const consumeGiftForBooking = async ({ bookingId, session }) => {
  requireTransaction(session);
  return UserGift.findOneAndUpdate(
    { booking_id: bookingId, status: "reserved" },
    { $set: { status: "used", used_at: new Date() } },
    { new: true, session },
  );
};

export const releaseGiftForBooking = async ({ bookingId, session }) => {
  requireTransaction(session);
  return UserGift.findOneAndUpdate(
    { booking_id: bookingId, status: "reserved" },
    { $set: { status: "available", booking_id: null, reserved_at: null } },
    { new: true, session },
  );
};

export const getGiftBookingQuote = async ({ userGiftId, userId, user, seats, combos, movieId, orderAmount, session }) => {
  if (!userGiftId) return null;
  validId(userGiftId);
  const item = await UserGift.findOne({ _id: userGiftId, user_id: userId, status: "available", expires_at: { $gt: new Date() } }).session(session);
  if (!item) throw loyaltyError("Quà không còn khả dụng.", 409);
  if (!["ticket", "combo"].includes(item.snapshot?.type)) throw loyaltyError("Quà này không dùng được khi đặt vé.", 409);
  if (!["online", "both"].includes(item.snapshot?.redemption_channel)) throw loyaltyError("Quà này chỉ sử dụng tại quầy.", 409);
  if (!conditionsMatch({ gift: item.snapshot, user, movieId, orderAmount, comboIds: combos.map((entry) => entry.combo_id) })) {
    throw loyaltyError("Đơn hàng chưa đáp ứng điều kiện của quà.", 409);
  }
  const benefit = item.snapshot.benefit || {};
  let discount = 0;
  if (item.snapshot.type === "ticket") {
    const allowed = benefit.seat_types || [];
    const eligible = seats.filter((seat) => !allowed.length || allowed.includes(String(seat.seat_id?.seat_type_id?.name || seat.seat_type || "").toLowerCase()));
    const prices = eligible.map((seat) => Number(seat.price || 0)).sort((a, b) => b - a).slice(0, Math.max(Number(benefit.quantity || 1), 1));
    const cap = Number(benefit.max_unit_price || 0);
    discount = prices.reduce((sum, price) => sum + (cap > 0 ? Math.min(price, cap) : price), 0);
  } else {
    const targetId = String(benefit.combo_id || "");
    const quantity = Math.max(Number(benefit.quantity || 1), 1);
    const target = combos.find((entry) => String(entry.combo_id) === targetId);
    if (!target || Number(target.quantity || 0) < quantity) throw loyaltyError("Hãy chọn combo tương ứng trước khi dùng quà.", 409);
    discount = Math.min(Number(target.price || 0) * quantity, Number(target.subtotal || 0));
  }
  if (discount <= 0) throw loyaltyError("Quà không áp dụng được cho nội dung đơn hiện tại.", 409);
  return { item, discount, snapshot: { user_gift_id: item._id, gift_id: item.gift_id, code: item.code, type: item.snapshot.type, discount_amount: discount, label: item.snapshot.name } };
};

export const issueAutomaticGiftsForBooking = async ({ booking, user, session }) => {
  requireTransaction(session);
  const templates = await Gift.find({ ...activeWindow(), acquisition_modes: "automatic", trigger: "paid_booking" }).session(session);
  const comboIds = (booking.combos || []).map((item) => item.combo_id);
  for (const gift of templates) {
    if (!conditionsMatch({ gift, user, movieId: booking.movie_snapshot?.movie_id, orderAmount: booking.total_price, comboIds })) continue;
    try {
      await issueGiftInTransaction({ giftId: gift._id, userId: user._id, source: "automatic", issueKey: `booking:${booking._id}:gift:${gift._id}`, session });
    } catch (error) {
      if (error.statusCode !== 409) throw error;
    }
  }
};

export const issueScheduledGifts = async ({ now = new Date() } = {}) => {
  const templates = await Gift.find({
    ...activeWindow(now),
    acquisition_modes: "automatic",
    trigger: { $in: ["new_member", "birthday", "tier_reached"] },
  }).lean();
  let issued = 0;
  for (const gift of templates) {
    const filter = { ...ACTIVE_USER };
    if (gift.trigger === "new_member") filter.member_activated_at = { $gte: gift.start_date, $lte: now };
    if (gift.trigger === "birthday") filter.$expr = { $eq: [{ $month: "$birth_date" }, now.getMonth() + 1] };
    if (gift.trigger === "tier_reached" && gift.condition?.member_tiers?.length) filter.member_tier = { $in: gift.condition.member_tiers };
    const users = await User.find(filter).select("_id member_tier birth_date member_activated_at").limit(1000).lean();
    for (const user of users) {
      const period = gift.trigger === "birthday" ? String(now.getFullYear()) : gift.trigger === "tier_reached" ? user.member_tier : "once";
      try {
        await withTransaction((session) => issueGiftInTransaction({
          giftId: gift._id,
          userId: user._id,
          source: "automatic",
          issueKey: `${gift.trigger}:${gift._id}:${user._id}:${period}`,
          session,
        }));
        issued += 1;
      } catch (error) {
        if (error.statusCode !== 409 && error.code !== 11000) throw error;
      }
    }
  }
  return issued;
};

export const previewGiftGrant = async (adminId, body) => {
  validId(body.gift_id);
  requestKey(body.key);
  if (Boolean(body.email) === Boolean(body.tier)) throw loyaltyError("Chọn email hoặc nhóm hạng.");
  const filter = { ...ACTIVE_USER };
  if (body.email) filter.email = String(body.email).trim().toLowerCase();
  if (body.tier) filter.member_tier = body.tier;
  const request = JSON.stringify({ gift_id: body.gift_id, email: filter.email || "", tier: body.tier || "" });
  const existing = await GiftGrant.findOne({ key: body.key, admin_id: adminId });
  if (existing) return { id: existing._id, count: existing.user_ids.length, completed_at: existing.completed_at };
  const users = await User.find(filter).select("_id").limit(501).lean();
  if (!users.length) throw loyaltyError("Không có người nhận phù hợp.", 404);
  if (users.length > 500) throw loyaltyError("Mỗi đợt cấp tối đa 500 thành viên.");
  const gift = await Gift.findOne({ _id: body.gift_id, ...activeWindow(), acquisition_modes: "manual" });
  if (!gift || gift.remaining_quantity < users.length) throw loyaltyError("Chương trình không đủ quà khả dụng.", 409);
  const grant = await GiftGrant.create({ key: body.key, admin_id: adminId, gift_id: gift._id, user_ids: users.map((item) => item._id), request });
  return { id: grant._id, count: users.length, completed_at: null };
};

export const confirmGiftGrant = (adminId, id) => {
  validId(id);
  return withTransaction(async (session) => {
    const grant = await GiftGrant.findOne({ _id: id, admin_id: adminId }).session(session);
    if (!grant) throw loyaltyError("Không tìm thấy đợt cấp.", 404);
    if (grant.completed_at) return grant;
    for (const userId of grant.user_ids) {
      await issueGiftInTransaction({ giftId: grant.gift_id, userId, source: "manual", issueKey: `gift-grant:${grant._id}:${userId}`, adminId, session });
    }
    grant.completed_at = new Date();
    await grant.save({ session });
    return grant;
  });
};

export const getGiftGrantHistory = async (pageValue) => {
  const page = Math.max(Number.parseInt(pageValue, 10) || 1, 1);
  const [items, total] = await Promise.all([
    GiftGrant.find({ completed_at: { $ne: null } }).populate("gift_id", "name code").populate("admin_id", "full_name").sort({ completed_at: -1 }).skip((page - 1) * 10).limit(10).lean(),
    GiftGrant.countDocuments({ completed_at: { $ne: null } }),
  ]);
  return { data: items.map(({ user_ids, ...item }) => ({ ...item, count: user_ids.length })), pagination: { page, totalPages: Math.max(Math.ceil(total / 10), 1) } };
};

export const lookupGiftQr = async (payload) => {
  const token = parseGiftQrPayload(payload);
  if (!token) throw loyaltyError("Mã QR quà tặng không hợp lệ.");
  const item = await UserGift.findOne({ qr_token_hash: hashQrToken(token) }).select("+qr_token_hash").populate("user_id", "full_name email").lean();
  if (!item) throw loyaltyError("Không tìm thấy quà tặng.", 404);
  return { ...item, status: walletStatus(item) };
};

export const useGiftQr = (payload, staffId) => withTransaction(async (session) => {
  const token = parseGiftQrPayload(payload);
  if (!token) throw loyaltyError("Mã QR quà tặng không hợp lệ.");
  const item = await UserGift.findOneAndUpdate(
    { qr_token_hash: hashQrToken(token), status: "available", expires_at: { $gt: new Date() } },
    { $set: { status: "used", used_at: new Date(), redeemed_by: staffId } },
    { new: true, session },
  );
  if (!item) throw loyaltyError("Quà đã dùng, hết hạn hoặc không còn khả dụng.", 409);
  return item;
});

export const reconcileGiftInventory = async () => {
  const counts = await UserGift.aggregate([{ $group: { _id: "$gift_id", issued: { $sum: 1 } } }]);
  for (const row of counts) {
    const gift = await Gift.findById(row._id);
    if (!gift) continue;
    await Gift.updateOne({ _id: gift._id }, { $set: { issued_quantity: row.issued, remaining_quantity: Math.max(Number(gift.quantity || 0) - row.issued, 0) } });
  }
};

export const findBookingForGift = (bookingId, session) => Booking.findById(bookingId).session(session);
