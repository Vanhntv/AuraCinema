const FALLBACK_PAYMENT_CLOSE_PATH = "/lich-chieu";
const PAYMENT_RETURN_STORAGE_KEY = "auracinema:payment-return";
const ACTIVE_PROVIDER_PAYMENT_STORAGE_KEY = "auracinema:active-provider-payment";

const getStorage = (storage) => {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
};

const parseStoredValue = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const normalizeIds = (values) => Array.isArray(values)
  ? [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
  : [];

export const buildPaymentReturnState = (summary) => {
  const bookingId = String(summary?.bookingId || "").trim();
  const movieId = String(summary?.movieId || "").trim();
  const showtimeId = String(summary?.showtimeId || "").trim();
  const paymentExpiresAt = summary?.paymentExpiresAt || null;
  const selectedSeatIds = normalizeIds(summary?.selectedSeatIds);

  if (!bookingId || !showtimeId || !paymentExpiresAt || selectedSeatIds.length === 0) {
    return null;
  }

  return {
    ...summary,
    bookingId,
    movieId,
    showtimeId,
    selectedSeatIds,
    paymentExpiresAt,
  };
};

export const savePaymentReturnState = (summary, storage) => {
  const targetStorage = getStorage(storage);
  const state = buildPaymentReturnState(summary);
  if (!targetStorage || !state) return null;

  targetStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(state));
  return state;
};

export const readPaymentReturnState = ({ showtimeId, bookingId } = {}, storage) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return null;

  const state = parseStoredValue(targetStorage.getItem(PAYMENT_RETURN_STORAGE_KEY));
  if (!state) {
    targetStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
    return null;
  }

  const normalized = buildPaymentReturnState(state);
  const deadline = new Date(normalized?.paymentExpiresAt || "").getTime();
  const matchesShowtime = !showtimeId || String(normalized?.showtimeId || "") === String(showtimeId);
  const matchesBooking = !bookingId || String(normalized?.bookingId || "") === String(bookingId);

  if (!normalized || !Number.isFinite(deadline) || deadline <= Date.now() || !matchesShowtime || !matchesBooking) {
    if (!showtimeId && !bookingId) targetStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
    return null;
  }

  return normalized;
};

export const clearPaymentReturnState = (bookingId, storage) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;

  if (bookingId) {
    const current = parseStoredValue(targetStorage.getItem(PAYMENT_RETURN_STORAGE_KEY));
    if (current && String(current.bookingId || "") !== String(bookingId)) return;
  }
  targetStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
};

export const saveActiveProviderPayment = (payment, storage) => {
  const targetStorage = getStorage(storage);
  const bookingId = String(payment?.bookingId || "").trim();
  const provider = String(payment?.provider || "").trim().toLowerCase();
  if (!targetStorage || !bookingId || !provider) return null;

  const value = { bookingId, provider, startedAt: new Date().toISOString() };
  targetStorage.setItem(ACTIVE_PROVIDER_PAYMENT_STORAGE_KEY, JSON.stringify(value));
  return value;
};

export const readActiveProviderPayment = (storage) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return null;
  return parseStoredValue(targetStorage.getItem(ACTIVE_PROVIDER_PAYMENT_STORAGE_KEY));
};

export const clearActiveProviderPayment = (bookingId, storage) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;
  if (bookingId) {
    const current = readActiveProviderPayment(targetStorage);
    if (current && String(current.bookingId || "") !== String(bookingId)) return;
  }
  targetStorage.removeItem(ACTIVE_PROVIDER_PAYMENT_STORAGE_KEY);
};

export const buildPaymentClosePath = (summary) => {
  const showtimeId = String(summary?.showtimeId || "").trim();
  if (!showtimeId) return FALLBACK_PAYMENT_CLOSE_PATH;

  const startTime = new Date(summary?.showtimeStartTime || "");
  const date = Number.isNaN(startTime.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(startTime);
  const path = `/dat-ve/${encodeURIComponent(showtimeId)}`;
  return date ? `${path}?date=${encodeURIComponent(date)}` : path;
};
