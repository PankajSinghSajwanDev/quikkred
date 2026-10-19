const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { TeamMember } = require('../models/TeamMember');
const {
  hasPermission,
  serializeAdmin,
  serializeMemberStaff,
  isSuperAdmin,
  countGranted,
} = require('../lib/rbac');

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

    if (payload.actor === 'member') {
      const member = await TeamMember.findById(payload.sub);
      if (!member || countGranted(member.permissions) === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      req.admin = serializeMemberStaff(member);
      req.adminDoc = null;
      return next();
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (admin.active === false) {
      return res.status(401).json({ message: 'Account disabled' });
    }

    req.admin = serializeAdmin(admin);
    req.adminDoc = admin;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req.admin)) {
    return res.status(403).json({
      message: 'Only the admin can manage sub-admins',
    });
  }
  next();
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!hasPermission(req.admin, resource, action)) {
      return res.status(403).json({
        message: `You do not have permission to ${action} ${resource}`,
      });
    }
    next();
  };
}

function requireAnyPermission(checks) {
  return (req, res, next) => {
    const ok = checks.some(([resource, action]) =>
      hasPermission(req.admin, resource, action),
    );
    if (!ok) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAnyPermission,
};
