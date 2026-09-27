import { Resolver } from "node:dns/promises";
import { domainToASCII } from "node:url";

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;
const DNS_TIMEOUT_MS = 4000;
const POSITIVE_CACHE_MS = 10 * 60 * 1000;
const NEGATIVE_CACHE_MS = 60 * 1000;

const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

const DOMAIN_TYPOS = new Map([
  ["gmail.comm", "gmail.com"],
  ["gmail.con", "gmail.com"],
  ["gmai.com", "gmail.com"],
  ["gmial.com", "gmail.com"],
  ["outlok.com", "outlook.com"],
  ["hotmai.com", "hotmail.com"],
  ["yaho.com", "yahoo.com"],
]);

const domainCache = new Map();
const DEFINITIVE_DNS_ERRORS = new Set(["ENODATA", "ENOTFOUND", "ENODOMAIN"]);
const TRANSIENT_DNS_ERRORS = new Set([
  "ETIMEOUT",
  "ESERVFAIL",
  "EREFUSED",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

export const emailValidationError = (message, statusCode, code, details = {}) =>
  Object.assign(new Error(message), {
    publicMessage: message,
    statusCode,
    code,
    ...details,
  });

export const normalizeEmailKey = (input) => String(input || "").trim().toLowerCase();

export const validateEmailSyntax = (input) => {
  const value = String(input || "").trim();
  const firstAt = value.indexOf("@");
  const lastAt = value.lastIndexOf("@");

  if (
    !value ||
    value.length > MAX_EMAIL_LENGTH ||
    !BASIC_EMAIL_PATTERN.test(value) ||
    firstAt <= 0 ||
    firstAt !== lastAt ||
    firstAt === value.length - 1
  ) {
    throw emailValidationError("Email không đúng định dạng", 400, "EMAIL_INVALID_FORMAT");
  }

  const local = value.slice(0, firstAt);
  const rawDomain = value.slice(firstAt + 1);
  const domain = domainToASCII(rawDomain).toLowerCase();

  if (
    !domain ||
    local.length > MAX_LOCAL_LENGTH ||
    !LOCAL_PATTERN.test(local) ||
    domain.length > MAX_DOMAIN_LENGTH ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    throw emailValidationError("Email không đúng định dạng", 400, "EMAIL_INVALID_FORMAT");
  }

  if (!DOMAIN_PATTERN.test(domain)) {
    throw emailValidationError("Tên miền email không hợp lệ", 422, "EMAIL_DOMAIN_INVALID");
  }

  const email = `${local}@${domain}`;
  return {
    value,
    local,
    domain,
    email,
    // AuraCinema treats email as a case-insensitive login identifier.
    emailKey: email.toLowerCase(),
  };
};

export const findEmailDomainTypo = (domain) => DOMAIN_TYPOS.get(String(domain || "").toLowerCase()) || null;

const resolveWithTimeout = async (resolver, method, domain, timeoutMs) => {
  let timer;
  try {
    return await Promise.race([
      resolver[method](domain),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(Object.assign(new Error("DNS timeout"), { code: "ETIMEOUT" }));
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const isTransientDnsError = (error) => TRANSIENT_DNS_ERRORS.has(error?.code);
const isDefinitiveDnsError = (error) => DEFINITIVE_DNS_ERRORS.has(error?.code);

export const checkEmailDomain = async (domain, {
  resolver = new Resolver(),
  timeoutMs = DNS_TIMEOUT_MS,
  cache = domainCache,
  now = Date.now(),
} = {}) => {
  const cacheKey = String(domain || "").toLowerCase();
  const cached = cache?.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.result;

  try {
    const mxRecords = await resolveWithTimeout(resolver, "resolveMx", cacheKey, timeoutMs);
    const acceptsMail = mxRecords.some((record) => {
      const exchange = String(record?.exchange || "").trim();
      return exchange && exchange !== ".";
    });
    if (acceptsMail) {
      const result = { valid: true, method: "mx" };
      cache?.set(cacheKey, { result, expiresAt: now + POSITIVE_CACHE_MS });
      return result;
    }
    // A null MX explicitly states that the domain does not accept email.
    if (mxRecords.length > 0) {
      const result = { valid: false, method: "null-mx" };
      cache?.set(cacheKey, { result, expiresAt: now + NEGATIVE_CACHE_MS });
      return result;
    }
  } catch (error) {
    if (isTransientDnsError(error)) {
      throw emailValidationError(
        "Chưa thể kiểm tra tên miền email. Vui lòng thử lại sau.",
        503,
        "EMAIL_DOMAIN_CHECK_UNAVAILABLE",
      );
    }
    if (!isDefinitiveDnsError(error)) {
      throw emailValidationError(
        "Chưa thể kiểm tra tên miền email. Vui lòng thử lại sau.",
        503,
        "EMAIL_DOMAIN_CHECK_UNAVAILABLE",
      );
    }
  }

  const fallbackResolver = resolver;
  const addressResults = await Promise.allSettled([
    resolveWithTimeout(fallbackResolver, "resolve4", cacheKey, timeoutMs),
    resolveWithTimeout(fallbackResolver, "resolve6", cacheKey, timeoutMs),
  ]);
  const hasAddress = addressResults.some((result) =>
    result.status === "fulfilled" && Array.isArray(result.value) && result.value.length > 0
  );
  const hasTransientFailure = addressResults.some((result) =>
    result.status === "rejected" && isTransientDnsError(result.reason)
  );

  if (!hasAddress && hasTransientFailure) {
    throw emailValidationError(
      "Chưa thể kiểm tra tên miền email. Vui lòng thử lại sau.",
      503,
      "EMAIL_DOMAIN_CHECK_UNAVAILABLE",
    );
  }

  const result = hasAddress
    ? { valid: true, method: "address-fallback" }
    : { valid: false, method: "none" };
  cache?.set(cacheKey, {
    result,
    expiresAt: now + (hasAddress ? POSITIVE_CACHE_MS : NEGATIVE_CACHE_MS),
  });
  return result;
};

export const validateRegistrationEmail = async (input, options = {}) => {
  const parsed = validateEmailSyntax(input);
  const suggestion = findEmailDomainTypo(parsed.domain);

  if (suggestion) {
    throw emailValidationError(
      `Tên miền email không hợp lệ. Bạn có muốn dùng @${suggestion}?`,
      422,
      "EMAIL_DOMAIN_TYPO",
      { suggested_email: `${parsed.local}@${suggestion}` },
    );
  }

  const domainResult = await checkEmailDomain(parsed.domain, options);
  if (!domainResult.valid) {
    throw emailValidationError("Tên miền email không hợp lệ", 422, "EMAIL_DOMAIN_INVALID");
  }

  return { ...parsed, domainCheck: domainResult };
};

export const clearEmailDomainCache = () => domainCache.clear();
