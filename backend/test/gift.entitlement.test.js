import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Booking from "../src/models/Booking.js";
import UserGift from "../src/models/UserGift.js";
import { buildGiftQrPayload, parseGiftQrPayload } from "../src/services/giftEntitlementService.js";
import { prepareGiftCreatePayload, validateGiftPayload } from "../src/services/giftService.js";
import { withTransaction } from "../src/services/transactionService.js";

test("gift QR uses a dedicated prefix and rejects ticket payloads", () => {
  assert.equal(buildGiftQrPayload("secret"), "AURA_GIFT:secret");
  assert.equal(parseGiftQrPayload("AURA_GIFT:secret"), "secret");
  assert.equal(parseGiftQrPayload("AURA_TICKET:secret"), "");
});

test("owned gifts keep an immutable snapshot and lifecycle state", () => {
  const item = new UserGift({
    user_id: "64b64c6f2f4a2f1a9c0d1111",
    gift_id: "64b64c6f2f4a2f1a9c0d2222",
    source: "manual",
    issue_key: "manual-test-user-gift",
    issue_slot: 1,
    snapshot: { name: "Combo sinh nhật", type: "combo" },
    expires_at: new Date("2026-12-31T23:59:59.000Z"),
  });
  assert.equal(item.status, "available");
  assert.equal(item.snapshot.name, "Combo sinh nhật");
  assert.match(item.code, /^AG[A-F0-9]{20}$/);
});

test("booking stores gift attribution separately from voucher", () => {
  const booking = new Booking({
    booking_code: "AURA123456789012",
    showtime_id: "64b64c6f2f4a2f1a9c0d3333",
    showtime_seat_ids: ["64b64c6f2f4a2f1a9c0d4444"],
    customer_name: "Test User",
    customer_email: "test@example.com",
    total_price: 0,
    gift: { code: "AGTEST", type: "ticket", discount_amount: 70000 },
  });
  assert.equal(booking.gift.type, "ticket");
  assert.equal(booking.gift.discount_amount, 70000);
  assert.equal(booking.voucher.code, "");
});

test("automatic gifts require a concrete trigger", async () => {
  const payload = prepareGiftCreatePayload({
    name: "Quà tự động",
    code: "AUTO-GIFT",
    type: "ticket",
    acquisition_modes: ["automatic"],
    trigger: "none",
    redemption_channel: "online",
    value: 70000,
    value_label: "Một vé",
    quantity: 10,
    start_date: "2026-09-01T00:00:00.000Z",
    end_date: "2026-10-01T00:00:00.000Z",
  });
  const error = await validateGiftPayload(payload, { isCodeTaken: async () => false });
  assert.match(error, /chọn sự kiện phát/);
});

test("gift transactions explain the replica set requirement", async (t) => {
  t.mock.method(mongoose, "startSession", async () => ({
    withTransaction: async () => {
      throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
    },
    endSession: async () => {},
  }));
  await assert.rejects(
    withTransaction(async () => null),
    (error) => error.statusCode === 503 && /quà tặng/.test(error.message),
  );
});
