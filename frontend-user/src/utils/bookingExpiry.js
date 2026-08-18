export function getRemainingSeconds(expiresAt, now = new Date()) {
  if (!expiresAt) return 0;
  const deadlineMs = new Date(expiresAt).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function isBookingExpired(paymentStatus, expiresAt, now = new Date()) {
  if (paymentStatus === "paid") return false;
  if (["expired", "refund_pending"].includes(String(paymentStatus || ""))) return true;
  if (!expiresAt) return false;
  return getRemainingSeconds(expiresAt, now) === 0;
}
