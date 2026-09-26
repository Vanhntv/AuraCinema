const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

export const getEmailSyntaxError = (input) => {
  const email = String(input || "").trim();
  const firstAt = email.indexOf("@");

  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    /\s/.test(email) ||
    firstAt <= 0 ||
    firstAt !== email.lastIndexOf("@") ||
    firstAt === email.length - 1
  ) {
    return "Email không đúng định dạng";
  }

  const local = email.slice(0, firstAt);
  const domain = email.slice(firstAt + 1).toLowerCase();

  if (
    local.length > MAX_LOCAL_LENGTH ||
    !LOCAL_PATTERN.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return "Email không đúng định dạng";
  }

  if (!DOMAIN_PATTERN.test(domain)) {
    return "Tên miền email không hợp lệ";
  }

  return "";
};

export const normalizeEmailForRequest = (input) => {
  const email = String(input || "").trim();
  const at = email.lastIndexOf("@");
  if (at < 0) return email;
  return `${email.slice(0, at)}@${email.slice(at + 1).toLowerCase()}`;
};
