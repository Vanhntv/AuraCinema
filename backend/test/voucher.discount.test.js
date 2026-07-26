import test from "node:test";
import assert from "node:assert/strict";
import { calculateVoucherDiscount } from "../src/services/voucherService.js";

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
