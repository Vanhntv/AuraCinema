const isEmptyValue = (value) =>
  value === undefined || value === null || value === "";

export const normalizeVoucherPayload = (payload, defaults = {}) => {
  return {
    code: payload.code ?? defaults.code,
    discount_type: payload.discount_type ?? defaults.discount_type,
    discount_value: payload.discount_value ?? defaults.discount_value,
    min_order: payload.min_order ?? defaults.min_order,
    quantity: payload.quantity ?? defaults.quantity,
    start_date: payload.start_date ?? defaults.start_date,
    end_date: payload.end_date ?? defaults.end_date,
    status: payload.status ?? defaults.status,
  };
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

  if (!/^[A-Za-z0-9_-]+$/.test(code.trim())) {
    return `${prefix}code chi duoc chua chu cai, so, dau gach ngang va gach duoi`;
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
  if (value < 0) {
    return `${prefix}quantity khong duoc am`;
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

  if (startDate && endDate && endDate < startDate) {
    return `${prefix}end_date phai lon hon hoac bang start_date`;
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

  const quantityError = validateVoucherQuantity(voucher.quantity, prefix, true);
  if (quantityError) return quantityError;

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

  if ("quantity" in voucher) {
    const quantityError = validateVoucherQuantity(voucher.quantity, prefix, false);
    if (quantityError) return quantityError;
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

  return null;
};
