import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";

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

  const amount = Math.max(Number(booking.total_price || 0), 0);
  const points = calculateEarnedRewardPoints(amount);
  const user = await User.findOneAndUpdate(
    { _id: booking.user_id, deleted_at: null, status: true },
    { $inc: { total_spent: amount, reward_points: points } },
    { new: true, session },
  );

  if (!user) return { points: 0, credited: false };

  booking.reward_points_earned = points;
  booking.reward_points_credited_at = new Date();

  if (points > 0) {
    await RewardPointLog.create([{
      user_id: booking.user_id,
      booking_id: booking._id,
      type: "earn",
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

  const points = Math.max(Number(booking.reward_points_earned || 0), 0);
  const amount = Math.max(Number(booking.total_price || 0), 0);
  const user = await User.findOneAndUpdate(
    { _id: booking.user_id, deleted_at: null },
    [{
      $set: {
        reward_points: { $max: [{ $subtract: ["$reward_points", points] }, 0] },
        total_spent: { $max: [{ $subtract: ["$total_spent", amount] }, 0] },
      },
    }],
    { returnDocument: "after", session },
  );

  if (!user) return { points: 0, reversed: false };

  booking.reward_points_reversed_at = new Date();
  if (points > 0) {
    await RewardPointLog.create([{
      user_id: booking.user_id,
      booking_id: booking._id,
      type: "subtract",
      points,
      balance_after: Number(user.reward_points || 0),
      reason: `Thu hồi điểm do hoàn tiền đơn ${booking.booking_code}`,
    }], { session });
  }

  return { points, reversed: true };
};
