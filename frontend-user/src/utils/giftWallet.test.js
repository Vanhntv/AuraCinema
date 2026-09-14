import test from "node:test";
import assert from "node:assert/strict";
import { giftMatchesWalletFilter, giftRedemptionDestination } from "./giftWallet.js";

test("gift wallet separates transferred benefits from used gifts", () => {
  assert.equal(giftMatchesWalletFilter({ status: "available" }, "available"), true);
  assert.equal(giftMatchesWalletFilter({ status: "reserved" }, "available"), true);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "available"), false);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "used"), false);
  assert.equal(giftMatchesWalletFilter({ status: "fulfilled" }, "fulfilled"), true);
});

test("instant gifts navigate to the wallet section that received the benefit", () => {
  assert.deepEqual(giftRedemptionDestination("voucher"), {
    walletKind: "voucher",
    filter: "available",
    notice: "Đổi quà thành công. Voucher đã được thêm vào Ví ưu đãi.",
  });
  assert.equal(giftRedemptionDestination("point").filter, "fulfilled");
  assert.equal(giftRedemptionDestination("ticket").filter, "available");
});
