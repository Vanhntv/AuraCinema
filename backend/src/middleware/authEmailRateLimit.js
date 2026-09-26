// IP limiting complements persistent, per-account OTP quotas.
// Use Express's trusted req.ip rather than accepting arbitrary forwarded headers.
export const createAuthEmailRateLimit = ({ max = 20, windowMs = 15 * 60 * 1000 } = {}) => {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
    if (bucket.count >= max) {
      const retry = Math.ceil((bucket.until - now) / 1000);
      res.setHeader("Retry-After", String(retry));
      return res.status(429).json({ success: false, retry_after_seconds: retry,
        message: "Bạn yêu cầu quá nhiều lần. Vui lòng thử lại sau." });
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    next();
  };
};
