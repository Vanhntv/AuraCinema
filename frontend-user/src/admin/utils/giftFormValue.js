export const resolveGiftFormValue = (form, original = null) => {
  if (original?.type === form.type && original.value_label === form.value_label.trim()) {
    return Number(original.value || 0);
  }
  if (!["point", "voucher"].includes(form.type)) return Number(form.value || 0);
  const pattern = form.type === "point"
    ? /^\+?\s*(\d+|\d{1,3}(?:\.\d{3})+)\s*điểm$/iu
    : /^(?:voucher\s+)?(\d+|\d{1,3}(?:\.\d{3})+)\s*(?:VNĐ|VND|đ|đồng)$/iu;
  const match = form.value_label.trim().match(pattern);
  return match ? Number(match[1].replaceAll(".", "")) : NaN;
};
