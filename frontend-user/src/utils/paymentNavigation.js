const FALLBACK_PAYMENT_CLOSE_PATH = "/tai-khoan?tab=tickets";

export const buildPaymentClosePath = (summary) => {
  const movieId = String(summary?.movieId || "").trim();
  if (!movieId) return FALLBACK_PAYMENT_CLOSE_PATH;

  return `/phim/${encodeURIComponent(movieId)}#lich-chieu`;
};
