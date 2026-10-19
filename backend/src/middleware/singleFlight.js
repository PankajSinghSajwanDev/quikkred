const crypto = require('crypto');
const { actorKey } = require('../lib/requestMeta');

const inflight = new Set();
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function bodyHash(body) {
  if (body === undefined || body === null) return '';
  try {
    return crypto
      .createHash('sha256')
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex')
      .slice(0, 20);
  } catch {
    return '';
  }
}

function singleFlight(req, res, next) {
  if (!MUTATING.has(req.method)) return next();

  const key = `${actorKey(req)}:${req.method}:${req.originalUrl}:${bodyHash(req.body)}`;
  if (inflight.has(key)) {
    return res.status(429).json({
      message: 'Request already in progress. Please wait.',
    });
  }

  inflight.add(key);
  const release = () => inflight.delete(key);
  res.once('finish', release);
  res.once('close', release);
  next();
}

module.exports = { singleFlight };
