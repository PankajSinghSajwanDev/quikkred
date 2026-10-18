const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function requireAdmin(req, res, next) {
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
    const admin = await Admin.findById(payload.sub);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.admin = {
      id: String(admin._id),
      username: admin.username,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin };
