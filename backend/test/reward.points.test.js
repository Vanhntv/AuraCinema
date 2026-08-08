import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEarnedRewardPoints,
  REWARD_POINTS_PER_VND,
} from "../src/services/rewardPointService.js";

test("reward points are earned from paid amount after discounts", () => {
  assert.equal(calculateEarnedRewardPoints(130000), 13);
  assert.equal(calculateEarnedRewardPoints(139999), 13);
  assert.equal(calculateEarnedRewardPoints(0), 0);
  assert.equal(calculateEarnedRewardPoints(9999), 0);
  assert.equal(calculateEarnedRewardPoints(20000, REWARD_POINTS_PER_VND), 2);
});
