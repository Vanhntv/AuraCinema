import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Voucher from "../src/models/Voucher.js";
import VoucherUsage from "../src/models/VoucherUsage.js";
import VoucherUsageCounter from "../src/models/VoucherUsageCounter.js";
import { isVoucherUsageExhausted, voucherUsageCapacityExpression } from "../src/modules/vouchers/voucher.availability.js";
import { normalizeVoucherForResponse, reserveVoucherUsageForPayment, releaseReservedVoucherForBooking, consumeVoucherQuantityService, toggleVoucherStatusService, listVouchers } from "../src/services/voucherService.js";

const withPatched = async (patches, callback) => {
  const originals = patches.map(([target, key, replacement]) => {
    const original = target[key];
    target[key] = replacement;
    return [target, key, original];
  });
  try { await callback(); } finally {
    for (const [target, key, original] of originals.reverse()) target[key] = original;
  }
};

const base = { status: true, quantity: 1, usage_limit: 100, usage_count: 99 };

test("exhausted vouchers are paused in API responses, including legacy stock-zero vouchers", () => {
  for (const voucher of [{ ...base, quantity: 0 }, { ...base, usage_count: 100 }, { ...base, usage_count: 101 }]) {
    assert.equal(isVoucherUsageExhausted(voucher), true);
    const response = normalizeVoucherForResponse(voucher);
    assert.equal(response.computed_status, "paused");
    assert.equal(response.status, false);
    assert.equal(response.is_usage_exhausted, true);
  }
  assert.equal(normalizeVoucherForResponse(base).computed_status, "active");
  assert.equal(normalizeVoucherForResponse({ ...base, status: false }).computed_status, "paused");
  assert.equal(normalizeVoucherForResponse({ ...base, quantity: 0, deleted_at: new Date() }).computed_status, "cancelled");
});

test("legacy vouchers with no explicit limit keep using available stock", () => {
  assert.equal(isVoucherUsageExhausted({ quantity: 1, usage_count: 20, usage_limit: null }), false);
  assert.equal(isVoucherUsageExhausted({ quantity: 0, usage_count: 20, usage_limit: null }), true);
});

test("paused filter includes exhausted legacy vouchers and preserves keyword search", async () => {
  let query;
  const chain = { sort() { return this; }, skip() { return this; }, limit: async () => [] };
  await withPatched([
    [Voucher, "find", (filter) => { query = filter; return chain; }],
    [Voucher, "countDocuments", async () => 0],
  ], async () => {
    await listVouchers({ status: "paused", search: "AURA", page: 1, limit: 10 });
    assert.equal(query.$and[0].$or[0].status, false);
    assert.ok(query.$and[0].$or[1].$or);
    assert.equal(query.$or[0].code.$regex, "AURA");
    await listVouchers({ status: "active", page: 1, limit: 10 });
    assert.deepEqual(query.$expr, voucherUsageCapacityExpression());
    assert.deepEqual(query.quantity, { $gt: 0 });
  });
});

test("reservation enforces total usage capacity and conditionally pauses in the same session", async () => {
  const calls = [];
  const session = { task: "test-session" };
  const voucherId = new mongoose.Types.ObjectId();
  await withPatched([[Voucher, "updateOne", async (...args) => { calls.push(args); return { modifiedCount: 1 }; }]], async () => {
    assert.equal(await reserveVoucherUsageForPayment({ voucherId, session }), true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0][0].$expr, voucherUsageCapacityExpression(1));
    assert.equal(calls[0][1].$inc.usage_count, 1);
    assert.equal(calls[1][0].status, true);
    assert.ok(calls[1][0].$or);
    assert.deepEqual(calls[1][1].$set, { status: false, paused_by_usage: true });
    assert.equal(calls[1][2].session, session);
  });
});

test("direct consumption returns paused status when the last use is consumed", async () => {
  const voucher = { ...base, _id: new mongoose.Types.ObjectId(), quantity: 0, usage_count: 100 };
  await withPatched([
    [Voucher, "findOneAndUpdate", async (filter) => {
      assert.deepEqual(filter.$expr, voucherUsageCapacityExpression(1));
      return voucher;
    }],
    [Voucher, "updateOne", async () => ({ modifiedCount: 1 })],
  ], async () => {
    const result = await consumeVoucherQuantityService({ voucherId: voucher._id });
    assert.equal(result.voucher.status, false);
    assert.equal(result.voucher.paused_by_usage, true);
  });
});

test("exhausted codes cannot be manually reactivated", async () => {
  let saved = false;
  await withPatched([[Voucher, "findOne", async () => ({ ...base, quantity: 0, status: false, save: async () => { saved = true; } })]], async () => {
    await assert.rejects(toggleVoucherStatusService(new mongoose.Types.ObjectId()), { statusCode: 409 });
    assert.equal(saved, false);
  });
});

test("consumption with remaining capacity does not change status", async () => {
  const voucher = { ...base, _id: new mongoose.Types.ObjectId() };
  await withPatched([
    [Voucher, "findOneAndUpdate", async () => voucher],
    [Voucher, "updateOne", async (filter) => { assert.ok(filter.$or); return { modifiedCount: 0 }; }],
  ], async () => {
    const result = await consumeVoucherQuantityService({ voucherId: voucher._id });
    assert.equal(result.voucher.status, true);
    assert.equal(result.remaining_quantity, 1);
  });
});

test("cancellation restores capacity and only reactivates automatically paused codes", async () => {
  const calls = [];
  const usage = { voucher_id: new mongoose.Types.ObjectId(), user_id: new mongoose.Types.ObjectId(), save: async () => {} };
  await withPatched([
    [VoucherUsage, "findOne", () => ({ session: async () => usage })],
    [Voucher, "updateOne", async (...args) => { calls.push(args); return { modifiedCount: 1 }; }],
    [VoucherUsageCounter, "updateOne", async () => ({ modifiedCount: 1 })],
  ], async () => {
    await releaseReservedVoucherForBooking({ bookingId: new mongoose.Types.ObjectId() });
    assert.equal(calls[0][1].$inc.usage_count, -1);
    assert.equal(calls[1][0].paused_by_usage, true);
    assert.deepEqual(calls[1][0].$expr, voucherUsageCapacityExpression());
    assert.deepEqual(calls[1][1].$set, { status: true, paused_by_usage: false });
    assert.equal(usage.status, "cancelled");
  });
});
