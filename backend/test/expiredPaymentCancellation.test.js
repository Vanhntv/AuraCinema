import assert from "node:assert/strict";
import test from "node:test";
import { cancelExpiredSepayPgPayments } from "../src/services/expiredPaymentCancellationService.js";

const queryResult = (items) => ({
  sort() { return this; },
  async limit() { return items; },
});

test("expired SePay gateway payments are cancelled with their invoice number", async () => {
  const candidate = {
    _id: "payment-1",
    transaction_ref: "AURA123",
    payment_code: "AURA123",
  };
  const updates = [];
  const cancelled = [];
  const payments = {
    find: () => queryResult([candidate]),
    findOneAndUpdate: async () => ({ ...candidate, provider_cancel_attempts: 1 }),
    updateOne: async (filter, update) => {
      updates.push({ filter, update });
      return { modifiedCount: 1 };
    },
  };

  const result = await cancelExpiredSepayPgPayments({
    now: new Date("2026-09-27T03:05:00.000Z"),
    payments,
    cancelOrder: async (invoice) => cancelled.push(invoice),
  });

  assert.deepEqual(result, { processed: 1, succeeded: 1 });
  assert.deepEqual(cancelled, ["AURA123"]);
  assert.equal(updates.at(-1).update.$set.provider_cancel_status, "succeeded");
});

test("unsupported SePay cancellation becomes terminal without breaking the worker", async () => {
  const candidate = { _id: "payment-2", transaction_ref: "AURA456" };
  let finalUpdate;
  const payments = {
    find: () => queryResult([candidate]),
    findOneAndUpdate: async () => candidate,
    updateOne: async (_filter, update) => {
      finalUpdate = update;
      return { modifiedCount: 1 };
    },
  };

  const result = await cancelExpiredSepayPgPayments({
    payments,
    cancelOrder: async () => {
      throw Object.assign(new Error("Phương thức không hỗ trợ hủy"), { statusCode: 422 });
    },
  });

  assert.deepEqual(result, { processed: 1, succeeded: 0 });
  assert.equal(finalUpdate.$set.provider_cancel_status, "not_applicable");
  assert.equal(finalUpdate.$set.provider_cancel_next_attempt_at, null);
});
