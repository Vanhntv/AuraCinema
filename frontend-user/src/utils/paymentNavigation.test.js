import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPaymentClosePath,
  clearActiveProviderPayment,
  clearPaymentReturnState,
  readActiveProviderPayment,
  readPaymentReturnState,
  saveActiveProviderPayment,
  savePaymentReturnState,
} from "./paymentNavigation.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test("payment close returns to the exact showtime and date", () => {
  assert.equal(buildPaymentClosePath({
    showtimeId: "showtime-456",
    showtimeStartTime: "2026-08-19T10:30:00+07:00",
  }), "/dat-ve/showtime-456?date=2026-08-19");
});

test("payment close falls back to schedule without a showtime", () => {
  assert.equal(buildPaymentClosePath(null), "/lich-chieu");
});

test("payment return state preserves booking seats and the original deadline", () => {
  const storage = createStorage();
  const deadline = new Date(Date.now() + 60_000).toISOString();
  savePaymentReturnState({
    bookingId: "booking-1",
    showtimeId: "showtime-1",
    selectedSeatIds: ["seat-1", "seat-2"],
    paymentExpiresAt: deadline,
  }, storage);

  assert.deepEqual(readPaymentReturnState({ showtimeId: "showtime-1" }, storage), {
    bookingId: "booking-1",
    movieId: "",
    showtimeId: "showtime-1",
    selectedSeatIds: ["seat-1", "seat-2"],
    paymentExpiresAt: deadline,
  });
  clearPaymentReturnState("booking-1", storage);
  assert.equal(readPaymentReturnState({}, storage), null);
});

test("expired payment return state is rejected", () => {
  const storage = createStorage();
  savePaymentReturnState({
    bookingId: "booking-1",
    showtimeId: "showtime-1",
    selectedSeatIds: ["seat-1"],
    paymentExpiresAt: new Date(Date.now() - 1_000).toISOString(),
  }, storage);

  assert.equal(readPaymentReturnState({}, storage), null);
});

test("active provider payment can be restored and cleared", () => {
  const storage = createStorage();
  saveActiveProviderPayment({ bookingId: "booking-1", provider: "vnpay" }, storage);
  assert.equal(readActiveProviderPayment(storage).provider, "vnpay");
  clearActiveProviderPayment("booking-1", storage);
  assert.equal(readActiveProviderPayment(storage), null);
});
