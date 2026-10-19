const { clientIp } = require('../lib/requestMeta');

function createRateLimiter({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
  skip,
} = {}) {
  const hits = new Map();

  const prune = () => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  };

  const timer = setInterval(prune, Math.min(windowMs, 60_000));
  if (typeof timer.unref === 'function') timer.unref();

  return function rateLimit(req, res, next) {
    if (skip?.(req)) return next();

    const now = Date.now();
    const key = clientIp(req);
    let entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSec = Math.ceil((entry.start + windowMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSec));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(resetSec, 1)));
      return res.status(429).json({ message });
    }
    next();
  };
}

const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  message: 'Too many requests. Slow down and try again.',
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  message: 'Too many login attempts. Try again in a few minutes.',
});

module.exports = { createRateLimiter, globalLimiter, authLimiter };
