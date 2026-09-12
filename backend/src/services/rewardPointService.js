import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { tierUpdateStage } from "./loyaltyPolicy.js";
import { requireTransaction } from "./transactionService.js";

export const REWARD_POINTS_PER_VND = 10000;

export const calculateEarnedRewardPoints = (amount, rate = REWARD_POINTS_PER_VND) => {
  const normalizedAmount = Math.max(Number(amount || 0), 0);
  const normalizedRate = Math.max(Number(rate || REWARD_POINTS_PER_VND), 1);
  return Math.floor(normalizedAmount / normalizedRate);
};

export const creditRewardPointsForBooking = async ({ booking, session = null } = {}) => {
  if (!booking?.user_id || booking.reward_points_credited_at) {
    return { points: Number(booking?.reward_points_earned || 0), credited: false };
  }
  requireTransaction(session);
  if (booking.payment_status !== "paid") throw new Error("Chỉ cộng điểm cho đơn đã thanh toán.");

  const amount = Math.max(Number(booking.total_price || 0), 0);
  const points = calculateEarnedRewardPoints(amount);
  const creditedAt = new Date();
  const claimed = await Booking.updateOne(
    { _id: booking._id, reward_points_credited_at: null },
    { $set: { reward_points_earned: points, reward_points_credited_at: creditedAt } },
    { session },
  );
  if (!claimed.modifiedCount) return { points: 0, credited: false };
  const user = await User.findOneAndUpdate(
    { _id: booking.user_id },
    [{ $set: {
      total_spent: { $add: [{ $ifNull: ["$total_spent", 0] }, amount] },
      reward_points: { $add: [{ $ifNull: ["$reward_points", 0] }, points] },
    } }, tierUpdateStage],
    { new: true, session, updatePipeline: true },
  );

  if (!user) throw new Error("Không tìm thấy chủ đơn để ghi nhận điểm.");

  booking.reward_points_earned = points;
  booking.reward_points_credited_at = creditedAt;

  if (points > 0) {
    await RewardPointLog.create([{
      user_id: booking.user_id,
      booking_id: booking._id,
      type: "earn",
      event_key: `earn:${booking._id}`,
      occurred_at: booking.paid_at || creditedAt,
      points,
      balance_after: Number(user.reward_points || 0),
      reason: `Tích điểm từ đơn ${booking.booking_code}`,
    }], { session });
  }

  return { points, credited: true };
};

export const reverseRewardPointsForBooking = async ({ booking, session = null } = {}) => {
  if (!booking?.user_id || !booking.reward_points_credited_at || booking.reward_points_reversed_at) {
    return { points: 0, reversed: false };
  }
  requireTransaction(session);

  const points = Math.max(Number(booking.reward_points_earned || 0), 0);
  const amount = Math.max(Number(booking.total_price || 0), 0);
  const reversedAt = new Date();
  const claimed = await Booking.updateOne(
    { _id: booking._id, reward_points_credited_at: { $ne: null }, reward_points_reversed_at: null },
    { $set: { reward_points_reversed_at: reversedAt } }, { session },
  );
  if (!claimed.modifiedCount) return { points: 0, reversed: false };
  const user = await User.findOneAndUpdate(
    { _id: booking.user_id },
    [{
      $set: {
        reward_points: { $subtract: [{ $ifNull: ["$reward_points", 0] }, points] },
        total_spent: { $max: [{ $subtract: ["$total_spent", amount] }, 0] },
      },
    }, tierUpdateStage],
    { returnDocument: "after", session, updatePipeline: true },
  );

  if (!user) throw new Error("Không tìm thấy chủ đơn để hoàn điểm.");

  booking.reward_points_reversed_at = reversedAt;
  if (points > 0) {
    await RewardPointLog.create([{
      user_id: booking.user_id,
      booking_id: booking._id,
      type: "subtract",
      event_key: `refund:${booking._id}`,
      occurred_at: reversedAt,
      points,
      balance_after: Number(user.reward_points || 0),
      reason: `Thu hồi điểm do hoàn tiền đơn ${booking.booking_code}`,
    }], { session });
  }

  return { points, reversed: true };
};

export const syncMissingRewardPointLogsForUser = async ({ userId, limit = 100 } = {}) => {
  if (!userId) return { created: 0 };

  const bookings = await Booking.find({
    user_id: userId,
    status: "confirmed",
    payment_status: "paid",
    reward_points_earned: { $gt: 0 },
    reward_points_credited_at: { $ne: null },
  })
    .sort({ paid_at: -1, created_at: -1 })
    .limit(limit)
    .select("_id booking_code reward_points_earned paid_at reward_points_credited_at");

  if (!bookings.length) return { created: 0 };

  const bookingIds = bookings.map((booking) => booking._id);
  const existingLogs = await RewardPointLog.find({
    user_id: userId,
    booking_id: { $in: bookingIds },
    type: "earn",
  }).select("booking_id");
  const loggedBookingIds = new Set(existingLogs.map((log) => String(log.booking_id)));
  const missingBookings = bookings.filter((booking) => !loggedBookingIds.has(String(booking._id)));

  if (!missingBookings.length) return { created: 0 };

  const docs = missingBookings.map((booking) => ({
    user_id: userId,
    booking_id: booking._id,
    type: "earn",
    points: Math.max(Number(booking.reward_points_earned || 0), 1),
    balance_after: null,
    reconstructed: true,
    occurred_at: booking.reward_points_credited_at || booking.paid_at || null,
    event_key: `earn:${booking._id}`,
    reason: `Tích điểm từ đơn ${booking.booking_code}`,
  }));

  try {
    await RewardPointLog.insertMany(docs, { ordered: false });
    return { created: docs.length };
  } catch (error) {
    if (error?.code !== 11000 && error?.name !== "BulkWriteError") {
      throw error;
    }

    const insertedCount = Number(error?.result?.insertedCount ?? error?.insertedDocs?.length ?? 0);
    return { created: insertedCount };
  }
};
