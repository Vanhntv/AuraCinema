import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVoucherPayload,
  validateVoucherUpdatePayload,
} from "../src/modules/vouchers/voucher.validation.js";

const validVoucher = {
  code: "WELCOME-2026",
  name: "Welcome 2026",
  discount_type: "percent",
  discount_value: 20,
  max_discount_amount: 50000,
  min_order: 100000,
  quantity: 100,
  usage_limit: 100,
  usage_limit_per_user: 1,
  apply_scope: "order",
  start_date: "2026-01-01T00:00:00.000Z",
  end_date: "2026-12-31T23:59:59.000Z",
  status: true,
};

test("validateVoucherPayload accepts valid voucher codes from business examples", () => {
  for (const code of ["AURA20", "WELCOME-2026", "MOVIE50K"]) {
    assert.equal(validateVoucherPayload({ ...validVoucher, code }), null);
  }
});

test("validateVoucherPayload rejects Vietnamese marks, spaces, and unsupported symbols in code", () => {
  assert.match(validateVoucherPayload({ ...validVoucher, code: "AURA 20" }), /khoang trang/);
  assert.match(validateVoucherPayload({ ...validVoucher, code: "ƯUDAI20" }), /chu cai khong dau/);
  assert.match(validateVoucherPayload({ ...validVoucher, code: "AURA_20" }), /chu cai khong dau/);
});

test("validateVoucherPayload enforces discount, date, and usage rules", () => {
  assert.match(validateVoucherPayload({ ...validVoucher, discount_value: 0 }), /lon hon 0/);
  assert.match(validateVoucherPayload({ ...validVoucher, discount_value: 101 }), /lon hon 100/);
  assert.match(validateVoucherPayload({ ...validVoucher, usage_limit: 1, usage_limit_per_user: 2 }), /lon hon usage_limit/);
  assert.match(
    validateVoucherPayload({
      ...validVoucher,
      start_date: "2026-12-31T00:00:00.000Z",
      end_date: "2026-01-01T00:00:00.000Z",
    }),
    /sau start_date/,
  );
});

test("validateVoucherUpdatePayload permits partial edits and validates changed fields", () => {
  assert.equal(validateVoucherUpdatePayload({ name: "New name" }), null);
  assert.match(validateVoucherUpdatePayload({ code: "BAD CODE" }), /khoang trang/);
  assert.match(validateVoucherUpdatePayload({ min_order: -1 }), /khong duoc am/);
});
