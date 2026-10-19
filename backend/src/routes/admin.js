const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { TeamMember } = require('../models/TeamMember');
const { requireAdmin } = require('../middleware/adminAuth');
const {
  serializeAdmin,
  serializeMemberStaff,
  countGranted,
} = require('../lib/rbac');
const {
  validateUsernamePassword,
  validateLogin,
  sendValidation,
} = require('../lib/validation');

const router = express.Router();

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signToken(admin) {
  const role = admin.role === 'sub_admin' ? 'sub_admin' : 'admin';
  return jwt.sign(
    { sub: String(admin._id), role },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
}

function signMemberToken(member) {
  return jwt.sign(
    { sub: String(member._id), role: 'sub_admin', actor: 'member' },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
}

// Check if the single super-admin already exists
router.get('/status', async (_req, res) => {
  const count = await Admin.countDocuments({
    $or: [{ role: 'admin' }, { role: { $exists: false } }],
  });
  res.json({ exists: count > 0 });
});

// Create the one-and-only super admin (blocked if already created)
router.post('/setup', async (req, res) => {
  const { username, password } = req.body || {};
  const { errors } = validateUsernamePassword(req.body || {}, { passwordMin: 8 });
  if (sendValidation(res, errors)) return;

  const count = await Admin.countDocuments({
    $or: [{ role: 'admin' }, { role: { $exists: false } }],
  });
  if (count > 0) {
    return res.status(403).json({
      message: 'Admin already exists. Create admin is disabled.',
    });
  }

  const hashed = await bcrypt.hash(String(password), 12);
  const admin = await Admin.create({
    username: String(username).trim().toLowerCase(),
    password: hashed,
    role: 'admin',
  });

  const token = signToken(admin);
  res.status(201).json({
    message: 'Admin created',
    token,
    admin: serializeAdmin(admin),
  });
});

// Admin / sub-admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const { errors } = validateLogin(req.body || {});
  if (sendValidation(res, errors)) return;

  const loginId = String(username).trim().toLowerCase();
  const admin = await Admin.findOne({ username: loginId }).select('+password');

  if (admin) {
    if (admin.active === false) {
      return res.status(401).json({ message: 'Account disabled' });
    }
    const ok = await bcrypt.compare(String(password), admin.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    return res.json({
      token: signToken(admin),
      admin: serializeAdmin(admin),
    });
  }

  const member = await TeamMember.findOne({ email: loginId }).select('+password');
  if (!member || countGranted(member.permissions) === 0) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  const ok = await bcrypt.compare(String(password), member.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  res.json({
    token: signMemberToken(member),
    admin: serializeMemberStaff(member),
  });
});

// Current admin (protected)
router.get('/me', requireAdmin, async (req, res) => {
  res.json(req.admin);
});

module.exports = router;
