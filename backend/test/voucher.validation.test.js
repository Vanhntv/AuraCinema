import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVoucherPayload,
  validateVoucherUpdatePayload,
} from "../src/modules/vouchers/voucher.validation.js";

const futureDate = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

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
  start_date: futureDate(60 * 60 * 1000),
  end_date: futureDate(24 * 60 * 60 * 1000),
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
      start_date: futureDate(-60 * 60 * 1000),
    }),
    /qua khu/,
  );
  assert.match(
    validateVoucherPayload({
      ...validVoucher,
      start_date: futureDate(2 * 60 * 60 * 1000),
      end_date: futureDate(60 * 60 * 1000),
    }),
    /sau start_date/,
  );
});

test("validateVoucherUpdatePayload permits partial edits and validates changed fields", () => {
  assert.equal(validateVoucherUpdatePayload({ name: "New name" }), null);
  assert.match(validateVoucherUpdatePayload({ code: "BAD CODE" }), /khoang trang/);
  assert.match(validateVoucherUpdatePayload({ min_order: -1 }), /khong duoc am/);
});

test("scope movie requires valid movie ids", () => {
  assert.match(
    validateVoucherPayload({ ...validVoucher, apply_scope: "movie", applicable_movie_ids: [] }),
    /phải chọn ít nhất một phim/,
  );
  assert.match(
    validateVoucherPayload({ ...validVoucher, apply_scope: "movie", applicable_movie_ids: ["movie-1"] }),
    /Danh sách phim/,
  );
  assert.equal(
    validateVoucherPayload({
      ...validVoucher,
      apply_scope: "movie",
      applicable_movie_ids: ["507f1f77bcf86cd799439011"],
    }),
    null,
  );
});

test("scope member requires at least one member tier", () => {
  assert.match(
    validateVoucherPayload({ ...validVoucher, apply_scope: "member", applicable_member_tiers: [] }),
    /phải chọn ít nhất một hạng/,
  );
  assert.equal(
    validateVoucherPayload({ ...validVoucher, apply_scope: "member", applicable_member_tiers: ["vip"] }),
    null,
  );
});
