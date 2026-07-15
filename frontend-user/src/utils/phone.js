export const formatPhoneInput = (value) => {
  return value.replace(/\D/g, "").slice(0, 10);
};

export const isValidVietnamPhone = (value) => /^0\d{9}$/.test(value);
