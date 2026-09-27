export const isVoucherUsageExhausted = (voucher) => {
  const count = Number(voucher.usage_count || 0);
  const limit = voucher.usage_limit;
  return Number(voucher.quantity || 0) <= 0 || (limit !== null && limit !== undefined && count >= Number(limit));
};

export const voucherUsageCapacityExpression = (quantity = 1) => ({
  $lte: [
    { $add: [{ $ifNull: ["$usage_count", 0] }, quantity] },
    { $ifNull: ["$usage_limit", { $add: [{ $ifNull: ["$usage_count", 0] }, { $ifNull: ["$quantity", 0] }] }] },
  ],
});

export const exhaustedVoucherFilter = () => ({
  $or: [
    { quantity: { $lte: 0 } },
    { $expr: { $not: [voucherUsageCapacityExpression()] } },
  ],
});
