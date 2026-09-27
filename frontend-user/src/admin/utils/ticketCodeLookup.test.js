import test from "node:test";
import assert from "node:assert/strict";
import { isAuraBookingCode, normalizeTicketLookupCode } from "./ticketCodeLookup.js";

test("recognizes a booking code without a seat suffix", () => {
  assert.equal(isAuraBookingCode("AURA802138252429"), true);
  assert.equal(isAuraBookingCode(" aura802138252429 "), true);
});

test("keeps seat-specific ticket codes on the single-ticket lookup path", () => {
  assert.equal(isAuraBookingCode("AURA802138252429-A1"), false);
  assert.equal(isAuraBookingCode("AURA802138252429+A1"), false);
});

test("accepts a plus sign as an alternative separator for a seat-specific code", () => {
  assert.equal(normalizeTicketLookupCode("AURA802138252429+A1"), "AURA802138252429-A1");
  assert.equal(normalizeTicketLookupCode("AURA802138252429-A2"), "AURA802138252429-A2");
});
