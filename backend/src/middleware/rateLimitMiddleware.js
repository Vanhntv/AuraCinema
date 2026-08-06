const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;

const buckets = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || "unknown";
};

export const createRateLimitMiddleware = ({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  keyPrefix = "global",
  message = "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
} = {}) => {
  const normalizedWindowMs = parsePositiveInt(windowMs, DEFAULT_WINDOW_MS);
  const normalizedMaxRequests = parsePositiveInt(maxRequests, DEFAULT_MAX_REQUESTS);

  return (req, res, next) => {
    const now = Date.now();
    const userPart = req.user?.id || getClientIp(req);
    const key = `${keyPrefix}:${userPart}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + normalizedWindowMs,
      });
      return next();
    }

    if (current.count >= normalizedMaxRequests) {
      const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    current.count += 1;
    return next();
  };
};
