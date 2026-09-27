import test from "node:test";
import assert from "node:assert/strict";
import { resolveGiftFormValue } from "./giftFormValue.js";

test("reads explicitly formatted point and voucher values", () => {
  assert.equal(resolveGiftFormValue({ type: "point", value_label: "500 điểm" }), 500);
  assert.equal(resolveGiftFormValue({ type: "point", value_label: "+1.000 điểm" }), 1000);
  assert.equal(resolveGiftFormValue({ type: "voucher", value_label: "Voucher 50.000 VNĐ" }), 50000);
  assert.ok(Number.isNaN(resolveGiftFormValue({ type: "point", value_label: "Vé 2D 500 điểm" })));
  assert.ok(Number.isNaN(resolveGiftFormValue({ type: "voucher", value_label: "20%" })));
});

test("preserves existing values when the label is unchanged", () => {
  const original = { type: "point", value_label: "Ưu đãi thành viên", value: 100 };
  assert.equal(resolveGiftFormValue(original, original), 100);
  assert.equal(resolveGiftFormValue({ type: "ticket", value_label: "Một vé", value: 70000 }), 70000);
  assert.equal(resolveGiftFormValue({ type: "ticket", value_label: "Một vé", value: "" }), 0);
});
