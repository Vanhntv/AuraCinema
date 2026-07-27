import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveGiftStatus,
  getGiftDeletionType,
  normalizeGiftForResponse,
  prepareGiftCreatePayload,
  validateGiftPayload,
} from "../src/services/giftService.js";

const validGiftInput = {
  name: "Combo Big sinh nhật",
  code: "GIFT-BIG-2026",
  description: "Tặng combo Big cho khách đủ điều kiện",
  image_url: "https://cdn.auracinema.vn/gifts/combo-big.webp",
  type: "combo",
  value_label: "Combo Big",
  value: 0,
  quantity: 100,
  condition: {
    min_order: 300000,
    member_tier: "gold",
    birthday: true,
    campaign: "Sinh nhật Aura",
    note: "Đơn trên 300.000 VNĐ, khách Gold, sinh nhật",
  },
  start_date: "2026-01-01T00:00:00.000Z",
  end_date: "2026-12-31T23:59:59.000Z",
  status: "active",
};

const validateInput = (input, options = {}) =>
  validateGiftPayload(prepareGiftCreatePayload(input), {
    isCodeTaken: async () => false,
    ...options,
  });

test("validateGiftPayload accepts a valid gift payload", async () => {
  assert.equal(await validateInput(validGiftInput), null);
});

test("validateGiftPayload rejects duplicated gift code", async () => {
  const error = await validateInput(validGiftInput, {
    isCodeTaken: async () => true,
  });

  assert.match(error, /Mã quà đã tồn tại/);
});

test("validateGiftPayload rejects empty name", async () => {
  const error = await validateInput({ ...validGiftInput, name: "   " });

  assert.match(error, /Tên quà là bắt buộc/);
});

test("validateGiftPayload rejects invalid gift value", async () => {
  const invalidNumberError = await validateInput({
    ...validGiftInput,
    value_label: "",
    value: "abc",
  });
  const missingVoucherValueError = await validateInput({
    ...validGiftInput,
    type: "voucher",
    value_label: "Voucher 0 VNĐ",
    value: 0,
  });

  assert.match(invalidNumberError, /Giá trị quà không hợp lệ/);
  assert.match(missingVoucherValueError, /voucher phải có giá trị lớn hơn 0/);
});

test("validateGiftPayload rejects non-positive quantity", async () => {
  const zeroError = await validateInput({ ...validGiftInput, quantity: 0 });
  const decimalError = await validateInput({ ...validGiftInput, quantity: 1.5 });

  assert.match(zeroError, /lớn hơn 0/);
  assert.match(decimalError, /số nguyên/);
});

test("validateGiftPayload rejects end date before or equal start date", async () => {
  const error = await validateInput({
    ...validGiftInput,
    start_date: "2026-12-31T00:00:00.000Z",
    end_date: "2026-12-31T00:00:00.000Z",
  });

  assert.match(error, /Ngày kết thúc phải sau ngày bắt đầu/);
});

test("validateGiftPayload rejects invalid image URL format", async () => {
  const error = await validateInput({
    ...validGiftInput,
    image_url: "https://cdn.auracinema.vn/gifts/combo-big.txt",
  });

  assert.match(error, /URL ảnh jpg, jpeg, png, webp hoặc gif/);
});

test("getGiftDeletionType allows hard delete before issuing", () => {
  assert.equal(getGiftDeletionType({ issued_quantity: 0 }), "hard");
});

test("getGiftDeletionType uses soft delete after issuing", () => {
  assert.equal(getGiftDeletionType({ issued_quantity: 1 }), "soft");
});

test("normalizeGiftForResponse marks is_deleted gifts as cancelled", () => {
  const gift = normalizeGiftForResponse({
    ...prepareGiftCreatePayload(validGiftInput),
    is_deleted: true,
  });
  const status = deriveGiftStatus(gift);

  assert.equal(gift.is_deleted, true);
  assert.equal(gift.computed_status, "cancelled");
  assert.equal(status.value, "cancelled");
});
