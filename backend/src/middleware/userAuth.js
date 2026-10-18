const jwt = require('jsonwebtoken');
const { TeamMember } = require('../models/TeamMember');

async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const payload = jwt.verify(token, secret);
    if (payload.role !== 'user') {
      return res.status(403).json({ message: 'User access only' });
    }

    const member = await TeamMember.findById(payload.sub);
    if (!member) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: String(member._id),
      name: member.name,
      email: member.email,
      role: member.role,
      number: member.number,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireUser };
