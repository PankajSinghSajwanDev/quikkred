function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function actorKey(req) {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ') && header.length > 20) {
    return `tok:${header.slice(-24)}`;
  }
  return `ip:${clientIp(req)}`;
}

module.exports = { clientIp, actorKey };
