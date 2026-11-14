// Simple in-memory rate limiter (no extra packages).
// Counts requests per key in a time window; over the limit → 429 Too Many Requests.
// Note: counts reset if the server restarts — fine for this project.
function rateLimit({ windowMs, max, keyFn, message = "Too many requests. Please slow down." }) {
  const hits = new Map();

  // Clean up expired entries so memory doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - entry.count));
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const byPlatform = (req) => "platform:" + (req.platform?._id || req.ip);
const byIp = (req) => "ip:" + req.ip;

module.exports = { rateLimit, byPlatform, byIp };
