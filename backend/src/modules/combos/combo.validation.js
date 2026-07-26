const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const normalizeComboPayload = (payload, defaults = {}) => {
  return {
    name: payload.name ?? defaults.name,
    image: payload.image ?? defaults.image,
    description: payload.description ?? defaults.description,
    price: payload.price ?? defaults.price,
    stock: payload.stock ?? defaults.stock,
    status: payload.status ?? defaults.status,
  };
};

export const parseComboStatus = (value, fallback = true) => {
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

const validateComboName = (name, prefix) => {
  if (isEmptyValue(name)) {
    return `${prefix}name la bat buoc`;
  }

  if (typeof name !== "string") {
    return `${prefix}name khong hop le`;
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return `${prefix}name khong duoc de trong`;
  }

  if (trimmedName.length > 255) {
    return `${prefix}name khong duoc vuot qua 255 ky tu`;
  }

  return null;
};

const validateComboImage = (image, prefix, required = false) => {
  if (!required && isEmptyValue(image)) {
    return null;
  }

  if (isEmptyValue(image)) {
    return `${prefix}image la bat buoc`;
  }

  if (typeof image !== "string") {
    return `${prefix}image khong hop le`;
  }

  if (image.trim().length > 255) {
    return `${prefix}image khong duoc vuot qua 255 ky tu`;
  }

  return null;
};

const validateComboDescription = (description, prefix) => {
  if (isEmptyValue(description)) {
    return null;
  }

  if (typeof description !== "string") {
    return `${prefix}description khong hop le`;
  }

  return null;
};

const validateComboPrice = (price, prefix, required = true) => {
  if (!required && isEmptyValue(price)) {
    return null;
  }

  if (isEmptyValue(price)) {
    return `${prefix}price la bat buoc`;
  }

  const value = Number(price);

  if (Number.isNaN(value)) {
    return `${prefix}price khong hop le`;
  }

  if (value < 0) {
    return `${prefix}price khong duoc am`;
  }

  return null;
};

const validateComboStock = (stock, prefix, required = true) => {
  if (!required && isEmptyValue(stock)) {
    return null;
  }

  if (isEmptyValue(stock)) {
    return `${prefix}stock la bat buoc`;
  }

  const value = Number(stock);

  if (Number.isNaN(value)) {
    return `${prefix}stock khong hop le`;
  }

  if (!Number.isInteger(value)) {
    return `${prefix}stock phai la so nguyen`;
  }

  if (value < 0) {
    return `${prefix}stock khong duoc am`;
  }

  return null;
};

const validateComboStatus = (status, prefix) => {
  if (isEmptyValue(status)) {
    return null;
  }

  if (typeof status === "boolean") {
    return null;
  }

  if (typeof status === "string") {
    const normalizedValue = status.trim().toLowerCase();
    if (["true", "false", "1", "0", "active", "inactive", "enabled", "disabled"].includes(normalizedValue)) {
      return null;
    }
  }

  return `${prefix}status khong hop le`;
};

export const validateComboPayload = (combo, index = null) => {
  const prefix = index === null ? "" : `Combo ${index + 1}: `;

  const nameError = validateComboName(combo.name, prefix);
  if (nameError) return nameError;

  const imageError = validateComboImage(combo.image, prefix, false);
  if (imageError) return imageError;

  const descriptionError = validateComboDescription(combo.description, prefix);
  if (descriptionError) return descriptionError;

  const priceError = validateComboPrice(combo.price, prefix, true);
  if (priceError) return priceError;

  const stockError = validateComboStock(combo.stock, prefix, true);
  if (stockError) return stockError;

  const statusError = validateComboStatus(combo.status, prefix);
  if (statusError) return statusError;

  return null;
};

export const validateComboUpdatePayload = (combo, index = null) => {
  const prefix = index === null ? "" : `Combo ${index + 1}: `;

  if ("name" in combo) {
    const nameError = validateComboName(combo.name, prefix);
    if (nameError) return nameError;
  }

  if ("image" in combo) {
    const imageError = validateComboImage(combo.image, prefix, false);
    if (imageError) return imageError;
  }

  if ("description" in combo) {
    const descriptionError = validateComboDescription(combo.description, prefix);
    if (descriptionError) return descriptionError;
  }

  if ("price" in combo) {
    const priceError = validateComboPrice(combo.price, prefix, false);
    if (priceError) return priceError;
  }

  if ("stock" in combo) {
    const stockError = validateComboStock(combo.stock, prefix, false);
    if (stockError) return stockError;
  }

  if ("status" in combo) {
    const statusError = validateComboStatus(combo.status, prefix);
    if (statusError) return statusError;
  }

  return null;
};
