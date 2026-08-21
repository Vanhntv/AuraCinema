import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEarnedRewardPoints,
  REWARD_POINTS_PER_VND,
  syncMissingRewardPointLogsForUser,
} from "../src/services/rewardPointService.js";
import Booking from "../src/models/Booking.js";
import RewardPointLog from "../src/models/RewardPointLog.js";
import User from "../src/models/User.js";

test("reward points are earned from paid amount after discounts", () => {
  assert.equal(calculateEarnedRewardPoints(130000), 13);
  assert.equal(calculateEarnedRewardPoints(139999), 13);
  assert.equal(calculateEarnedRewardPoints(0), 0);
  assert.equal(calculateEarnedRewardPoints(9999), 0);
  assert.equal(calculateEarnedRewardPoints(20000, REWARD_POINTS_PER_VND), 2);
});

test("missing reward point logs are backfilled without changing point balance", async () => {
  const originalBookingFind = Booking.find;
  const originalRewardLogFind = RewardPointLog.find;
  const originalRewardLogInsertMany = RewardPointLog.insertMany;
  const originalUserFindOne = User.findOne;
  const insertedDocs = [];

  const queryResult = (value) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    select() {
      return Promise.resolve(value);
    },
  });

  try {
    Booking.find = () => queryResult([
      {
        _id: "booking-with-log",
        booking_code: "AURA_EXISTING",
        reward_points_earned: 14,
      },
      {
        _id: "booking-missing-log",
        booking_code: "AURA_MISSING",
        reward_points_earned: 43,
      },
    ]);
    RewardPointLog.find = () => queryResult([
      { booking_id: "booking-with-log" },
    ]);
    User.findOne = () => ({
      select() {
        return Promise.resolve({ _id: "user-1", reward_points: 57 });
      },
    });
    RewardPointLog.insertMany = async (docs) => {
      insertedDocs.push(...docs);
      return docs;
    };

    const result = await syncMissingRewardPointLogsForUser({ userId: "user-1" });

    assert.deepEqual(result, { created: 1 });
    assert.equal(insertedDocs.length, 1);
    assert.equal(insertedDocs[0].booking_id, "booking-missing-log");
    assert.equal(insertedDocs[0].points, 43);
    assert.equal(insertedDocs[0].balance_after, 57);
    assert.equal(insertedDocs[0].reason, "Tích điểm từ đơn AURA_MISSING");
  } finally {
    Booking.find = originalBookingFind;
    RewardPointLog.find = originalRewardLogFind;
    RewardPointLog.insertMany = originalRewardLogInsertMany;
    User.findOne = originalUserFindOne;
  }
});
