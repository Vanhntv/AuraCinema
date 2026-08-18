import { getDateKey } from "./dateTime.js";

const FALLBACK_PAYMENT_CLOSE_PATH = "/tai-khoan?tab=tickets";

export const buildPaymentClosePath = (summary, currentDate = new Date()) => {
  const movieId = String(summary?.movieId || "").trim();
  if (!movieId) return FALLBACK_PAYMENT_CLOSE_PATH;

  const selectedDate = getDateKey(currentDate);
  const queryString = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
  return `/phim/${encodeURIComponent(movieId)}${queryString}#lich-chieu`;
};
