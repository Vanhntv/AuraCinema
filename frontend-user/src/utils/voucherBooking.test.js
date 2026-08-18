import test from "node:test";
import assert from "node:assert/strict";

import {
  getBookingResultPurchaseDetails,
  getVoucherBookingPricing,
  mergeBookingVoucherPricing,
} from "./voucherBooking.js";

test("keeps a verified voucher code for backend revalidation when the order total changes", () => {
  const pricing = getVoucherBookingPricing({
    appliedVoucher: {
      order_amount: 100000,
      discount_amount: 20000,
      final_amount: 80000,
      voucher: { code: "30000" },
    },
    totalPrice: 244001,
  });

  assert.deepEqual(pricing, {
    voucherCode: "30000",
    isCurrent: false,
    discountAmount: 0,
    finalTotal: 244001,
  });
});

test("uses the booking response as the source of truth after voucher revalidation", () => {
  const summary = mergeBookingVoucherPricing(
    {
      voucherCode: "30000",
      discountAmount: 0,
      finalTotal: 244001,
    },
    {
      voucher: { code: "30000" },
      discount_amount: 20000,
      total_price: 224001,
    },
  );

  assert.deepEqual(summary, {
    voucherCode: "30000",
    discountAmount: 20000,
    finalTotal: 224001,
  });
});

test("builds paid service line items and the actual voucher discount for the success page", () => {
  const details = getBookingResultPurchaseDetails({
    combos: [
      {
        _id: "booking-combo-1",
        combo_id: "combo-1",
        name: "Combo Cặp Đôi",
        price: 144001,
        quantity: 1,
        subtotal: 144001,
      },
      {
        _id: "booking-combo-2",
        combo_id: "combo-2",
        name: "Bắp rang bơ nhỏ",
        price: 63000,
        quantity: 2,
        subtotal: 126000,
      },
    ],
    voucher: {
      code: "30000",
      discount_value: 20,
      discount_amount: 20000,
    },
    discount_amount: 20000,
  });

  assert.deepEqual(details, {
    services: [
      {
        id: "booking-combo-1",
        name: "Combo Cặp Đôi",
        quantity: 1,
        unitPrice: 144001,
        subtotal: 144001,
      },
      {
        id: "booking-combo-2",
        name: "Bắp rang bơ nhỏ",
        quantity: 2,
        unitPrice: 63000,
        subtotal: 126000,
      },
    ],
    voucher: {
      code: "30000",
      discountAmount: 20000,
    },
  });
});
