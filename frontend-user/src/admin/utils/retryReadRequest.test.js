import test from "node:test";
import assert from "node:assert/strict";
import { retryReadRequest } from "./retryReadRequest.js";

test("retries a temporary backend disconnect and returns the recovered response", async () => {
  let calls = 0;
  const delays = [];
  const result = await retryReadRequest(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("disconnected"), { code: "ERR_NETWORK" });
    return { success: true };
  }, { wait: async (ms) => delays.push(ms) });
  assert.deepEqual(result, { success: true });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [600, 1200]);
});

test("retries Vite proxy failures but never hides persistent errors", async () => {
  for (const status of [500, 502, 503, 504]) {
    let calls = 0;
    const error = Object.assign(new Error("proxy failure"), { response: { status, data: "" } });
    await assert.rejects(retryReadRequest(async () => { calls += 1; throw error; }, { wait: async () => {} }), (received) => received === error);
    assert.equal(calls, 3);
  }
});

test("does not retry authentication, validation or structured server errors", async () => {
  for (const status of [400, 401, 403, 409, 500]) {
    let calls = 0;
    const error = Object.assign(new Error("API error"), { response: { status, data: { message: "API error" } } });
    await assert.rejects(retryReadRequest(async () => { calls += 1; throw error; }, { wait: async () => {} }), (received) => received === error);
    assert.equal(calls, 1);
  }
});
