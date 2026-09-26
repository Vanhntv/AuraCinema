import assert from "node:assert/strict";
import test from "node:test";
import { getEmailSyntaxError, normalizeEmailForRequest } from "./emailValidation.js";

test("accepts supported email syntax", () => {
  for (const email of [
    "kien99@gmail.com",
    "kien.99@gmail.com",
    "kien99+cinema@gmail.com",
    "user@company.vn",
    "student@school.edu.vn",
  ]) {
    assert.equal(getEmailSyntaxError(email), "", email);
  }
});

test("rejects missing parts, whitespace, repeated @ and invalid domains", () => {
  for (const email of [
    "kien.gmail.com",
    "@gmail.com",
    "kien@",
    "ki en@gmail.com",
    "kien@@gmail.com",
    "kien@gmail",
    "kien@gmail..com",
  ]) {
    assert.notEqual(getEmailSyntaxError(email), "", email);
  }
});

test("trims the address and lowercases its domain before requests", () => {
  assert.equal(
    normalizeEmailForRequest(" Kien.99+Cinema@GMAIL.COM "),
    "Kien.99+Cinema@gmail.com",
  );
});
