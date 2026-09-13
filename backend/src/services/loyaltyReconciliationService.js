import { randomBytes } from "node:crypto";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import RewardPointLog from "../models/RewardPointLog.js";
import UserVoucher from "../models/UserVoucher.js";
import Voucher from "../models/Voucher.js";
import { tierForSpend } from "./loyaltyPolicy.js";
import { withTransaction } from "./transactionService.js";

export const bookingNeedsRewardCreditReview = (booking, memberActivatedAt) => {
  if (booking.payment_status !== "paid" || booking.reward_points_credited_at) return false;
  if (!memberActivatedAt || !booking.created_at) return true;
  return new Date(booking.created_at) >= new Date(memberActivatedAt);
};

export const reconcileLoyaltyUser = async (id, { apply = false } = {}) => {
  const inspect = async session => {
    const user = await User.findById(id).session(session).lean();
    const bookings = await Booking.find({ user_id: id }).session(session).lean();
    const logs = await RewardPointLog.find({ user_id: id }).session(session).lean();
    const missing = [];
    const issues = [];
    let spent = 0;
    const memberActivatedAt = user.member_activated_at
      ? new Date(user.member_activated_at)
      : null;
    for (const booking of bookings) {
      if (bookingNeedsRewardCreditReview(booking, memberActivatedAt)) {
        issues.push(`paid-without-credit:${booking._id}`);
      }
      if (!booking.reward_points_credited_at) continue;
      // Historical reversals are read-only; do not reconstruct a removed workflow.
      if (booking.payment_status === "refunded" || booking.reward_points_reversed_at) {
        issues.push(`legacy-payment-history:${booking._id}`);
        continue;
      }
      if (!booking.reward_points_reversed_at) spent += Number(booking.total_price || 0);
      for (const [type, time] of [["earn", booking.reward_points_credited_at]]) {
        if (!time || !booking.reward_points_earned) continue;
        const matches = logs.filter(log => String(log.booking_id) === String(booking._id) && log.type === type);
        if (matches.length > 1) issues.push(`duplicate:${booking._id}:${type}`);
        if (!matches.length) missing.push({
          user_id: id, booking_id: booking._id, type, points: booking.reward_points_earned,
          event_key: `earn:${booking._id}`,
          balance_after: null, reconstructed: true, occurred_at: time,
          reason: `${type === "earn" ? "Tích" : "Thu hồi"} điểm từ đơn ${booking.booking_code} (phục dựng)`,
        });
      }
    }
    const expectedPoints = [...logs, ...missing].reduce((sum, log) => sum + (["subtract", "redeem"].includes(log.type) ? -1 : 1) * Number(log.points || 0), 0);
    if (expectedPoints !== Number(user.reward_points || 0)) issues.push("point-balance-mismatch");
    if (spent !== Number(user.total_spent || 0)) issues.push("spend-mismatch");
    const report = { user_id: id, expected_points: expectedPoints, actual_points: user.reward_points || 0, expected_spent: spent, actual_spent: user.total_spent || 0, missing_logs: missing.length, issues, applied: false };
    if (!apply || issues.length) return report;
    if (missing.length) await RewardPointLog.insertMany(missing, { session });
    for (const log of logs) {
      if (log.event_key) continue;
      const booking = bookings.find(b => String(b._id) === String(log.booking_id));
      const time = booking && log.type === "earn" ? booking.reward_points_credited_at : log.created_at;
      await RewardPointLog.updateOne({ _id: log._id }, { $set: {
        reconstructed: true, balance_after: null, occurred_at: time || null,
        event_key: booking && log.type === "earn" ? `earn:${booking._id}` : `legacy:${log._id}`,
      } }, { session });
    }
    const owned = await UserVoucher.find({ user_id: id }).session(session).lean();
    for (const item of owned) {
      if (item.snapshot && item.code) continue;
      const template = await Voucher.findById(item.voucher_id).session(session).lean();
      if (!template) continue;
      await UserVoucher.updateOne({ _id: item._id }, { $set: {
        code: item.code || `AW${randomBytes(10).toString("hex").toUpperCase()}`,
        snapshot: item.snapshot || template, source: item.source || "legacy",
        requires_review: true,
        expires_at: item.expires_at || template.end_date,
      } }, { session });
    }
    await User.updateOne({ _id: id }, { $set: {
      member_code: user.member_code || `AMC${randomBytes(8).toString("hex").toUpperCase()}`,
      member_activated_at: user.member_activated_at || null,
      member_tier: tierForSpend(spent), loyalty_reconciled_at: new Date(),
    } }, { session });
    report.applied = true;
    return report;
  };
  return apply ? withTransaction(inspect) : inspect(null);
};
