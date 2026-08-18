function normalizeAmount(value, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(amount, 0) : fallback;
}

export function getVoucherBookingPricing({ appliedVoucher, totalPrice }) {
  const normalizedTotal = normalizeAmount(totalPrice);
  const voucherCode = String(appliedVoucher?.voucher?.code || "").trim().toUpperCase();
  const verifiedOrderAmount = Number(appliedVoucher?.order_amount);
  const isCurrent = Boolean(
    voucherCode &&
      Number.isFinite(verifiedOrderAmount) &&
      verifiedOrderAmount === normalizedTotal,
  );
  const discountAmount = isCurrent
    ? Math.min(normalizeAmount(appliedVoucher?.discount_amount), normalizedTotal)
    : 0;
  const verifiedFinalAmount = Number(appliedVoucher?.final_amount);
  const finalTotal = isCurrent && Number.isFinite(verifiedFinalAmount)
    ? Math.min(normalizeAmount(verifiedFinalAmount), normalizedTotal)
    : normalizedTotal;

  return {
    voucherCode,
    isCurrent,
    discountAmount,
    finalTotal,
  };
}

export function mergeBookingVoucherPricing(summary, booking) {
  if (!booking) return summary;

  return {
    ...summary,
    voucherCode: String(booking.voucher?.code || summary?.voucherCode || "").trim().toUpperCase(),
    discountAmount: normalizeAmount(booking.discount_amount),
    finalTotal: normalizeAmount(booking.total_price),
  };
}

export function getBookingResultPurchaseDetails(booking) {
  const services = (booking?.combos || []).map((item, index) => {
    const quantity = Math.max(Math.trunc(normalizeAmount(item.quantity, 1)), 1);
    const unitPrice = normalizeAmount(item.price);
    const storedSubtotal = Number(item.subtotal);

    return {
      id: String(item._id || item.combo_id?._id || item.combo_id || `service-${index}`),
      name: item.name || "Dịch vụ",
      quantity,
      unitPrice,
      subtotal: Number.isFinite(storedSubtotal)
        ? Math.max(storedSubtotal, 0)
        : unitPrice * quantity,
    };
  });
  const voucherCode = String(booking?.voucher?.code || "").trim().toUpperCase();

  return {
    services,
    voucher: voucherCode
      ? {
          code: voucherCode,
          discountAmount: normalizeAmount(
            booking?.discount_amount ?? booking?.voucher?.discount_amount,
          ),
        }
      : null,
  };
}
