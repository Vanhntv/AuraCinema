import assert from "node:assert/strict";
import test from "node:test";
import {
  SEPAY_CHECKOUT_MESSAGE_TYPE,
  buildSepayCheckoutWindowName,
  isTrustedSepayCheckoutMessage,
  openSepayCheckoutWindow,
  submitSepayCheckoutForm,
} from "./sepayCheckoutWindow.js";

test("SePay checkout opens a reusable booking-specific popup", () => {
  const popup = { focusCalled: false, focus() { this.focusCalled = true; } };
  let openArguments;
  const browserWindow = {
    screen: { availWidth: 1440, availHeight: 900 },
    screenX: 0,
    screenY: 0,
    outerWidth: 1440,
    outerHeight: 900,
    open(...args) {
      openArguments = args;
      return popup;
    },
  };

  const result = openSepayCheckoutWindow("booking/123", browserWindow);

  assert.equal(result.popup, popup);
  assert.equal(result.target, buildSepayCheckoutWindowName("booking/123"));
  assert.equal(openArguments[0], "");
  assert.equal(openArguments[1], "auracinema_sepay_booking123");
  assert.match(openArguments[2], /popup=yes/);
  assert.equal(popup.focusCalled, true);
});

test("SePay form submits into the controlled popup", () => {
  const appendedInputs = [];
  let submitted = false;
  let removed = false;
  const form = {
    style: {},
    appendChild(input) { appendedInputs.push(input); },
    submit() { submitted = true; },
    remove() { removed = true; },
  };
  const documentObject = {
    createElement(tagName) {
      return tagName === "form" ? form : {};
    },
    body: { appendChild() {} },
  };

  submitSepayCheckoutForm({
    checkoutUrl: "https://pay.sepay.vn/v1/checkout",
    fields: { merchant: "merchant", order_amount: 160000 },
    target: "auracinema_sepay_booking123",
    documentObject,
  });

  assert.equal(form.method, "POST");
  assert.equal(form.target, "auracinema_sepay_booking123");
  assert.equal(submitted, true);
  assert.equal(removed, true);
  assert.deepEqual(appendedInputs.map(({ name, value }) => [name, value]), [
    ["merchant", "merchant"],
    ["order_amount", "160000"],
  ]);
});

test("SePay popup messages require matching origin, window and booking", () => {
  const source = {};
  const event = {
    origin: "http://localhost:5173",
    source,
    data: {
      type: SEPAY_CHECKOUT_MESSAGE_TYPE,
      bookingId: "booking-123",
    },
  };

  assert.equal(isTrustedSepayCheckoutMessage(event, {
    bookingId: "booking-123",
    expectedOrigin: "http://localhost:5173",
    expectedSource: source,
  }), true);
  assert.equal(isTrustedSepayCheckoutMessage(event, {
    bookingId: "booking-456",
    expectedOrigin: "http://localhost:5173",
    expectedSource: source,
  }), false);
  assert.equal(isTrustedSepayCheckoutMessage(event, {
    bookingId: "booking-123",
    expectedOrigin: "https://attacker.example",
    expectedSource: source,
  }), false);
  assert.equal(isTrustedSepayCheckoutMessage(event, {
    bookingId: "booking-123",
    expectedOrigin: "http://localhost:5173",
    expectedSource: {},
  }), false);
});
