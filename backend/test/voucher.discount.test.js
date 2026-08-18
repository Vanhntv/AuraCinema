import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Voucher from "../src/models/Voucher.js";
import VoucherUsage from "../src/models/VoucherUsage.js";
import {
  calculateVoucherDiscount,
  consumeReservedVoucherForBooking,
  reserveVoucherForBooking,
} from "../src/services/voucherService.js";

const withPatched = async (patches, callback) => {
  const originals = patches.map(([target, key, value]) => {
    const original = target[key];
    target[key] = value;
    return [target, key, original];
  });
  try {
    return await callback();
  } finally {
    for (const [target, key, original] of originals.reverse()) target[key] = original;
  }
};

test("calculateVoucherDiscount caps percent discount by max_discount_amount", () => {
  const result = calculateVoucherDiscount({
    voucher: {
      discount_type: "percent",
      discount_value: 20,
      max_discount_amount: 50000,
    },
    orderAmount: 300000,
  });

  assert.equal(result.raw_discount_amount, 60000);
  assert.equal(result.discount_amount, 50000);
  assert.equal(result.final_amount, 250000);
});

test("calculateVoucherDiscount applies percent discount without cap", () => {
  const result = calculateVoucherDiscount({
    voucher: {
      discount_type: "percent",
      discount_value: 10,
      max_discount_amount: 0,
    },
    orderAmount: 200000,
  });

  assert.equal(result.discount_amount, 20000);
  assert.equal(result.final_amount, 180000);
});

test("calculateVoucherDiscount never discounts more than eligible amount", () => {
  const result = calculateVoucherDiscount({
    voucher: {
      discount_type: "fixed",
      discount_value: 100000,
      max_discount_amount: 0,
    },
    orderAmount: 75000,
  });

  assert.equal(result.raw_discount_amount, 100000);
  assert.equal(result.discount_amount, 75000);
  assert.equal(result.final_amount, 0);
});

test("calculateVoucherDiscount returns null amounts when order amount is unavailable", () => {
  const result = calculateVoucherDiscount({
    voucher: {
      discount_type: "fixed",
      discount_value: 50000,
      max_discount_amount: 0,
    },
    orderAmount: null,
  });

  assert.equal(result.eligible_amount, null);
  assert.equal(result.discount_amount, null);
  assert.equal(result.final_amount, null);
});

test("calculateVoucherDiscount changes when booking total changes", () => {
  const voucher = {
    discount_type: "percent",
    discount_value: 15,
    max_discount_amount: 50000,
  };

  const beforeOrderChange = calculateVoucherDiscount({
    voucher,
    orderAmount: 100000,
  });
  const afterOrderChange = calculateVoucherDiscount({
    voucher,
    orderAmount: 200000,
  });

  assert.equal(beforeOrderChange.discount_amount, 15000);
  assert.equal(beforeOrderChange.final_amount, 85000);
  assert.equal(afterOrderChange.discount_amount, 30000);
  assert.equal(afterOrderChange.final_amount, 170000);
});

test("booking creation reserves one voucher usage until payment completes", async () => {
  const voucherId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  let usagePayload = null;

  await withPatched([
    [Voucher, "updateOne", async () => ({ modifiedCount: 1 })],
    [VoucherUsage, "create", async ([payload]) => {
      usagePayload = payload;
      return [payload];
    }],
  ], async () => {
    await reserveVoucherForBooking({
      bookingId,
      userId: null,
      subtotalPrice: 200000,
      voucherResult: {
        voucher: {
          id: voucherId,
          code: "AURA20",
          discount_type: "percent",
          discount_value: 20,
          apply_scope: "order",
          usage_limit_per_user: 1,
        },
        eligible_amount: 200000,
        discount_amount: 40000,
      },
    });

    assert.equal(usagePayload.status, "reserved");
    assert.equal(usagePayload.payment_status, "pending");
    assert.equal(usagePayload.discount_amount, 40000);
    assert.equal(usagePayload.final_price, 160000);
  });
});

test("payment consumes the voucher reservation without reserving a second usage", async () => {
  const bookingId = new mongoose.Types.ObjectId();
  const usage = {
    status: "reserved",
    payment_status: "pending",
    used_at: null,
    async save() { return this; },
  };

  await withPatched([
    [VoucherUsage, "findOne", () => ({ session: async () => usage })],
  ], async () => {
    const result = await consumeReservedVoucherForBooking({ bookingId });

    assert.equal(result.status, "used");
    assert.equal(result.payment_status, "paid");
    assert.ok(result.used_at instanceof Date);
  });
});
