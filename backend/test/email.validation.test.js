import assert from "node:assert/strict";
import test from "node:test";
import {
  checkEmailDomain,
  validateEmailSyntax,
  validateRegistrationEmail,
} from "../src/services/emailValidationService.js";

const dnsError = (code) => Object.assign(new Error(code), { code });

test("accepts common, company, school, dotted and plus-tag email addresses", () => {
  const valid = [
    "kien99@gmail.com",
    "kien.99@gmail.com",
    "kien99+cinema@gmail.com",
    "user@company.vn",
    "student@school.edu.vn",
    " User.Name+ticket@OUTLOOK.COM ",
  ];

  for (const email of valid) {
    assert.doesNotThrow(() => validateEmailSyntax(email), email);
  }
  assert.equal(
    validateEmailSyntax(" User.Name+ticket@OUTLOOK.COM ").emailKey,
    "user.name+ticket@outlook.com",
  );
});

test("rejects malformed addresses with a precise public error", () => {
  const invalid = [
    "kien.gmail.com",
    "@gmail.com",
    "kien@",
    "ki en@gmail.com",
    "kien@@gmail.com",
    "kien@gmail",
    "kien@-gmail.com",
    "kien@gmail..com",
    ".kien@gmail.com",
    "kien..99@gmail.com",
  ];

  for (const email of invalid) {
    assert.throws(
      () => validateEmailSyntax(email),
      (error) => ["EMAIL_INVALID_FORMAT", "EMAIL_DOMAIN_INVALID"].includes(error.code),
      email,
    );
  }
});

test("suggests a correction for obvious provider typos", async () => {
  await assert.rejects(
    validateRegistrationEmail("kien99@gmail.comm", { cache: null }),
    (error) => error.code === "EMAIL_DOMAIN_TYPO" && error.suggested_email === "kien99@gmail.com",
  );
  await assert.rejects(
    validateRegistrationEmail("kien99@gmai.com", { cache: null }),
    (error) => error.code === "EMAIL_DOMAIN_TYPO" && error.suggested_email === "kien99@gmail.com",
  );
});

test("accepts a domain with MX records", async () => {
  const resolver = {
    resolveMx: async () => [{ priority: 10, exchange: "mail.company.vn" }],
  };
  assert.deepEqual(
    await checkEmailDomain("company.vn", { resolver, cache: null }),
    { valid: true, method: "mx" },
  );
});

test("falls back to address records when MX is absent", async () => {
  const resolver = {
    resolveMx: async () => { throw dnsError("ENODATA"); },
    resolve4: async () => ["203.0.113.10"],
    resolve6: async () => { throw dnsError("ENODATA"); },
  };
  assert.deepEqual(
    await checkEmailDomain("company.vn", { resolver, cache: null }),
    { valid: true, method: "address-fallback" },
  );
});

test("rejects nonexistent and null-MX domains", async () => {
  const missingResolver = {
    resolveMx: async () => { throw dnsError("ENOTFOUND"); },
    resolve4: async () => { throw dnsError("ENOTFOUND"); },
    resolve6: async () => { throw dnsError("ENOTFOUND"); },
  };
  assert.equal(
    (await checkEmailDomain("missing.example", { resolver: missingResolver, cache: null })).valid,
    false,
  );

  const nullMxResolver = {
    resolveMx: async () => [{ priority: 0, exchange: "." }],
  };
  assert.deepEqual(
    await checkEmailDomain("no-mail.example", { resolver: nullMxResolver, cache: null }),
    { valid: false, method: "null-mx" },
  );
});

test("reports a temporary failure instead of rejecting a domain during DNS outage", async () => {
  const resolver = {
    resolveMx: async () => { throw dnsError("ETIMEOUT"); },
  };
  await assert.rejects(
    checkEmailDomain("company.vn", { resolver, cache: null }),
    { code: "EMAIL_DOMAIN_CHECK_UNAVAILABLE", statusCode: 503 },
  );
});
