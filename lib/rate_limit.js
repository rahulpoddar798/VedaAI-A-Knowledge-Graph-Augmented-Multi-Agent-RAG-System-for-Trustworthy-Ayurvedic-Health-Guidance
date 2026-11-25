/**
 * Lightweight fixed-window Express rate limiter with automatic expiry cleanup
 * and standard RateLimit / Retry-After response headers.
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 30,
  keyPrefix = 'api',
  message = 'Too many requests. Please wait before trying again.'
} = {}) {
  const hits = new Map();

  // Periodically sweep expired buckets so memory stays bounded; unref lets Node exit cleanly.
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 1000));
  if (typeof sweepTimer.unref === 'function') {
    sweepTimer.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${clientIp}`;

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        success: false,
        error: message
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
