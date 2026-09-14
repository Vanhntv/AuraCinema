import test from "node:test";
import assert from "node:assert/strict";
import { giftMatchesWalletFilter, giftRedemptionDestination, hasRedemptionStock, isWalletBenefitVisible, paginateRedemptions } from "./giftWallet.js";

test("gift wallet separates transferred benefits from used gifts", () => {
  assert.equal(giftMatchesWalletFilter({ status: "available" }, "available"), true);
  assert.equal(giftMatchesWalletFilter({ status: "reserved" }, "available"), true);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "available"), false);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "used"), false);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "fulfilled"), true);
});

test("user wallet hides used and expired benefits even when status is stale", () => {
  const now = new Date("2026-09-14T00:00:00.000Z");
  assert.equal(isWalletBenefitVisible({ status: "available", expires_at: "2026-09-15T00:00:00.000Z" }, now), true);
  assert.equal(isWalletBenefitVisible({ status: "available", expires_at: "2026-09-13T00:00:00.000Z" }, now), false);
  assert.equal(isWalletBenefitVisible({ status: "used", expires_at: "2026-09-15T00:00:00.000Z" }, now), false);
  assert.equal(isWalletBenefitVisible({ status: "expired", expires_at: "2026-09-15T00:00:00.000Z" }, now), false);
});

test("instant gifts navigate to the wallet section that received the benefit", () => {
  assert.deepEqual(giftRedemptionDestination("voucher"), {
    tab: "vouchers",
    walletKind: "voucher",
    filter: "available",
    notice: "Đổi quà thành công. Voucher đã được thêm vào Ví ưu đãi.",
  });
  assert.equal(giftRedemptionDestination("point").tab, "points");
  assert.equal(giftRedemptionDestination("ticket").tab, "vouchers");
});

test("redemption catalog displays fifteen offers per page", () => {
  const values = Array.from({ length: 32 }, (_, index) => index + 1);
  assert.deepEqual(paginateRedemptions(values, 1, 15), { items: values.slice(0, 15), page: 1, totalPages: 3 });
  assert.deepEqual(paginateRedemptions(values, 3, 15), { items: [31, 32], page: 3, totalPages: 3 });
  assert.deepEqual(paginateRedemptions(values.slice(0, 2), 3, 15), { items: [1, 2], page: 1, totalPages: 1 });
});

test("redemption catalog hides vouchers and gifts without stock", () => {
  assert.equal(hasRedemptionStock({ remaining: 0 }), false);
  assert.equal(hasRedemptionStock({ voucher_id: { quantity: 0 } }), false);
  assert.equal(hasRedemptionStock({ remaining_quantity: 0 }), false);
  assert.equal(hasRedemptionStock({ remaining: 1 }), true);
  assert.equal(hasRedemptionStock({ remaining_quantity: 5 }), true);
});
