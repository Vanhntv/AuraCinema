import test from "node:test";
import assert from "node:assert/strict";

import {
  validateComboPayload,
  validateComboUpdatePayload,
} from "../src/modules/combos/combo.validation.js";

const validCombo = {
  name: "Combo bap nuoc",
  type: "combo",
  price: 59000,
  stock: 10,
  status: true,
};

test("combo price accepts positive multiples of 1,000 VND", () => {
  assert.equal(validateComboPayload(validCombo), null);
  assert.equal(validateComboUpdatePayload({ price: 1000 }), null);
});

test("combo price rejects fractional and non-rounded VND amounts", () => {
  assert.equal(
    validateComboPayload({ ...validCombo, price: 59000.5 }),
    "price phai la boi so cua 1000",
  );
  assert.equal(
    validateComboUpdatePayload({ price: 59001 }),
    "price phai la boi so cua 1000",
  );
});
