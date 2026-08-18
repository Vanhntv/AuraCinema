import { getDateKey } from "./dateTime.js";

const FALLBACK_PAYMENT_CLOSE_PATH = "/tai-khoan?tab=tickets";

export const buildPaymentClosePath = (summary, currentDate = new Date()) => {
  const movieId = String(summary?.movieId || "").trim();
  if (!movieId) return FALLBACK_PAYMENT_CLOSE_PATH;

  const selectedDate = getDateKey(summary?.showtimeStartTime || currentDate);
  const searchParams = new URLSearchParams();
  if (selectedDate) searchParams.set("date", selectedDate);
  if (summary?.showtimeId) searchParams.set("showtime", String(summary.showtimeId));
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return `/phim/${encodeURIComponent(movieId)}${queryString}#lich-chieu`;
};
