export function getRemainingSeconds(expiresAt, now = new Date()) {
  if (!expiresAt) return 0;
  const deadlineMs = new Date(expiresAt).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function formatPaymentCountdown(remainingSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getPaymentCountdownTone(remainingSeconds) {
  const safeSeconds = Math.max(0, Number(remainingSeconds) || 0);
  if (safeSeconds === 0) return "expired";
  return safeSeconds <= 120 ? "urgent" : "default";
}

export function isBookingExpired(paymentStatus, expiresAt, now = new Date()) {
  if (paymentStatus === "paid") return false;
  if (["expired", "refund_pending"].includes(String(paymentStatus || ""))) return true;
  if (!expiresAt) return false;
  return getRemainingSeconds(expiresAt, now) === 0;
}
