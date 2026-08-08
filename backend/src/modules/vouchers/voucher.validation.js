const isEmptyValue = (value) =>
  value === undefined || value === null || value === "";

export const normalizeVoucherPayload = (payload, defaults = {}) => {
  return {
    code: payload.code ?? defaults.code,
    name: payload.name ?? defaults.name,
    description: payload.description ?? defaults.description,
    image_url: payload.image_url ?? defaults.image_url,
    discount_type: payload.discount_type ?? defaults.discount_type,
    discount_value: payload.discount_value ?? defaults.discount_value,
    max_discount_amount: payload.max_discount_amount ?? defaults.max_discount_amount,
    min_order: payload.min_order ?? defaults.min_order,
    quantity: payload.quantity ?? defaults.quantity,
    usage_limit: payload.usage_limit ?? defaults.usage_limit,
    usage_count: payload.usage_count ?? defaults.usage_count,
    usage_limit_per_user: payload.usage_limit_per_user ?? defaults.usage_limit_per_user,
    apply_scope: payload.apply_scope ?? defaults.apply_scope,
    applicable_movie_ids: payload.applicable_movie_ids ?? defaults.applicable_movie_ids,
    applicable_member_tiers: payload.applicable_member_tiers ?? defaults.applicable_member_tiers,
    terms_and_conditions: payload.terms_and_conditions ?? defaults.terms_and_conditions,
    start_date: payload.start_date ?? defaults.start_date,
    end_date: payload.end_date ?? defaults.end_date,
    status: payload.status ?? defaults.status,
  };
};

export const parseVoucherApplyScope = (value, fallback = "order") => {
  if (isEmptyValue(value)) {
    return fallback;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (["order", "ticket", "concession", "movie", "member"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallback;
};

export const parseVoucherDiscountType = (value, fallback = "percent") => {
  if (isEmptyValue(value)) {
    return fallback;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "percent" || normalizedValue === "fixed") {
    return normalizedValue;
  }

  return fallback;
};

export const parseVoucherStatus = (value, fallback = true) => {
  if (isEmptyValue(value)) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "1", "active", "enabled"].includes(normalizedValue)) return true;
    if (["false", "0", "inactive", "disabled"].includes(normalizedValue)) return false;
  }

  return fallback;
};

export const validateVoucherScopeConfiguration = (voucher, prefix = "") => {
  const scope = parseVoucherApplyScope(voucher.apply_scope, null);
  const movieIds = Array.isArray(voucher.applicable_movie_ids)
    ? voucher.applicable_movie_ids.filter((value) => !isEmptyValue(value))
    : [];
  const memberTiers = Array.isArray(voucher.applicable_member_tiers)
    ? voucher.applicable_member_tiers.filter((value) => !isEmptyValue(value))
    : [];

  if (scope === "movie") {
    if (!movieIds.length) {
      return `${prefix}Mã áp dụng theo phim phải chọn ít nhất một phim`;
    }
    if (movieIds.some((value) => !/^[a-f\d]{24}$/i.test(String(value)))) {
      return `${prefix}Danh sách phim áp dụng không hợp lệ`;
    }
  }

  if (scope === "member" && !memberTiers.length) {
    return `${prefix}Mã áp dụng theo thành viên phải chọn ít nhất một hạng thành viên`;
  }

  return null;
};

const parseDateValue = (value) => {
  if (isEmptyValue(value)) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateVoucherCode = (code, prefix) => {
  if (isEmptyValue(code)) {
    return `${prefix}code la bat buoc`;
  }

  if (typeof code !== "string") {
    return `${prefix}code khong hop le`;
  }

  if (code.trim().length < 3) {
    return `${prefix}code phai co it nhat 3 ky tu`;
  }

  const normalizedCode = code.trim();
  if (/\s/.test(normalizedCode)) {
    return `${prefix}code khong duoc chua khoang trang`;
  }

  if (!/^[A-Za-z0-9-]+$/.test(normalizedCode)) {
    return `${prefix}code chi duoc chua chu cai khong dau, so va dau gach ngang`;
  }

  return null;
};

const validateVoucherDiscountType = (discountType, prefix) => {
  if (isEmptyValue(discountType)) {
    return `${prefix}discount_type la bat buoc`;
  }

  if (!["percent", "fixed"].includes(parseVoucherDiscountType(discountType, null))) {
    return `${prefix}discount_type khong hop le`;
  }

  return null;
};

const validateVoucherDiscountValue = (discountValue, discountType, prefix) => {
  if (isEmptyValue(discountValue)) {
    return `${prefix}discount_value la bat buoc`;
  }

  const value = Number(discountValue);
  if (Number.isNaN(value)) {
    return `${prefix}discount_value khong hop le`;
  }
  if (value <= 0) {
    return `${prefix}discount_value phai lon hon 0`;
  }
  if (parseVoucherDiscountType(discountType, null) === "percent" && value > 100) {
    return `${prefix}discount_value khong duoc lon hon 100 khi discount_type la percent`;
  }

  return null;
};

const validateVoucherMinOrder = (minOrder, prefix) => {
  if (isEmptyValue(minOrder)) {
    return null;
  }

  const value = Number(minOrder);
  if (Number.isNaN(value)) {
    return `${prefix}min_order khong hop le`;
  }
  if (value < 0) {
    return `${prefix}min_order khong duoc am`;
  }

  return null;
};

const validateOptionalAmount = (amount, field, prefix) => {
  if (isEmptyValue(amount)) {
    return null;
  }

  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `${prefix}${field} khong hop le`;
  }
  if (value < 0) {
    return `${prefix}${field} khong duoc am`;
  }

  return null;
};

const validateVoucherQuantity = (quantity, prefix, required = true) => {
  if (!required && isEmptyValue(quantity)) {
    return null;
  }

  if (isEmptyValue(quantity)) {
    return `${prefix}quantity la bat buoc`;
  }

  const value = Number(quantity);
  if (Number.isNaN(value)) {
    return `${prefix}quantity khong hop le`;
  }
  if (!Number.isInteger(value)) {
    return `${prefix}quantity phai la so nguyen`;
  }
  if (value <= 0) {
    return `${prefix}quantity phai lon hon 0`;
  }

  return null;
};

const validatePositiveInteger = (value, field, prefix, required = false) => {
  if (!required && isEmptyValue(value)) {
    return null;
  }

  if (isEmptyValue(value)) {
    return `${prefix}${field} la bat buoc`;
  }

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return `${prefix}${field} khong hop le`;
  }
  if (!Number.isInteger(numberValue)) {
    return `${prefix}${field} phai la so nguyen`;
  }
  if (numberValue <= 0) {
    return `${prefix}${field} phai lon hon 0`;
  }

  return null;
};

const validateVoucherDates = (startDateInput, endDateInput, prefix, required = true) => {
  const hasStartDate = !isEmptyValue(startDateInput);
  const hasEndDate = !isEmptyValue(endDateInput);

  if (required && !hasStartDate) {
    return `${prefix}start_date la bat buoc`;
  }

  if (required && !hasEndDate) {
    return `${prefix}end_date la bat buoc`;
  }

  if (!hasStartDate && !hasEndDate) {
    return null;
  }

  const startDate = parseDateValue(startDateInput);
  if (hasStartDate && !startDate) {
    return `${prefix}start_date khong hop le`;
  }

  const endDate = parseDateValue(endDateInput);
  if (hasEndDate && !endDate) {
    return `${prefix}end_date khong hop le`;
  }

  if (startDate && endDate && endDate <= startDate) {
    return `${prefix}end_date phai sau start_date`;
  }

  return null;
};

export const validateVoucherPayload = (voucher, index = null) => {
  const prefix = index === null ? "" : `Voucher ${index + 1}: `;

  const codeError = validateVoucherCode(voucher.code, prefix);
  if (codeError) return codeError;

  const discountTypeError = validateVoucherDiscountType(voucher.discount_type, prefix);
  if (discountTypeError) return discountTypeError;

  const discountValueError = validateVoucherDiscountValue(
    voucher.discount_value,
    voucher.discount_type,
    prefix
  );
  if (discountValueError) return discountValueError;

  const minOrderError = validateVoucherMinOrder(voucher.min_order, prefix);
  if (minOrderError) return minOrderError;

  const maxDiscountError = validateOptionalAmount(voucher.max_discount_amount, "max_discount_amount", prefix);
  if (maxDiscountError) return maxDiscountError;

  const quantityError = validateVoucherQuantity(voucher.quantity, prefix, true);
  if (quantityError) return quantityError;

  const usageLimitError = validatePositiveInteger(voucher.usage_limit, "usage_limit", prefix, true);
  if (usageLimitError) return usageLimitError;

  const usageLimitPerUserError = validatePositiveInteger(
    voucher.usage_limit_per_user,
    "usage_limit_per_user",
    prefix,
    true
  );
  if (usageLimitPerUserError) return usageLimitPerUserError;

  if (Number(voucher.usage_limit_per_user) > Number(voucher.usage_limit)) {
    return `${prefix}usage_limit_per_user khong duoc lon hon usage_limit`;
  }

  const scopeError = validateVoucherScopeConfiguration(voucher, prefix);
  if (scopeError) return scopeError;

  const dateError = validateVoucherDates(voucher.start_date, voucher.end_date, prefix, true);
  if (dateError) return dateError;

  if (!isEmptyValue(voucher.status) && typeof voucher.status !== "boolean" && typeof voucher.status !== "string") {
    return `${prefix}status khong hop le`;
  }

  return null;
};

export const validateVoucherUpdatePayload = (voucher, index = null) => {
  const prefix = index === null ? "" : `Voucher ${index + 1}: `;

  if ("code" in voucher) {
    const codeError = validateVoucherCode(voucher.code, prefix);
    if (codeError) return codeError;
  }

  if ("discount_type" in voucher) {
    const discountTypeError = validateVoucherDiscountType(voucher.discount_type, prefix);
    if (discountTypeError) return discountTypeError;
  }

  if ("discount_value" in voucher) {
    const discountValueError = validateVoucherDiscountValue(
      voucher.discount_value,
      voucher.discount_type,
      prefix
    );
    if (discountValueError) return discountValueError;
  }

  if ("min_order" in voucher) {
    const minOrderError = validateVoucherMinOrder(voucher.min_order, prefix);
    if (minOrderError) return minOrderError;
  }

  if ("max_discount_amount" in voucher) {
    const maxDiscountError = validateOptionalAmount(voucher.max_discount_amount, "max_discount_amount", prefix);
    if (maxDiscountError) return maxDiscountError;
  }

  if ("quantity" in voucher) {
    const quantityError = validateVoucherQuantity(voucher.quantity, prefix, false);
    if (quantityError) return quantityError;
  }

  if ("usage_limit" in voucher) {
    const usageLimitError = validatePositiveInteger(voucher.usage_limit, "usage_limit", prefix, false);
    if (usageLimitError) return usageLimitError;
  }

  if ("usage_limit_per_user" in voucher) {
    const usageLimitPerUserError = validatePositiveInteger(
      voucher.usage_limit_per_user,
      "usage_limit_per_user",
      prefix,
      false
    );
    if (usageLimitPerUserError) return usageLimitPerUserError;
  }

  if (
    "usage_limit" in voucher &&
    "usage_limit_per_user" in voucher &&
    Number(voucher.usage_limit_per_user) > Number(voucher.usage_limit)
  ) {
    return `${prefix}usage_limit_per_user khong duoc lon hon usage_limit`;
  }

  if ("start_date" in voucher || "end_date" in voucher) {
    const dateError = validateVoucherDates(
      voucher.start_date,
      voucher.end_date,
      prefix,
      false
    );
    if (dateError) return dateError;
  }

  if ("status" in voucher && !isEmptyValue(voucher.status) && typeof voucher.status !== "boolean" && typeof voucher.status !== "string") {
    return `${prefix}status khong hop le`;
  }

  const scopeError = validateVoucherScopeConfiguration(voucher, prefix);
  if (scopeError) return scopeError;

  return null;
};
