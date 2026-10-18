const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

function signToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { sub: String(admin._id), role: 'admin' },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
}

// Check if the single admin already exists
router.get('/status', async (_req, res) => {
  const count = await Admin.countDocuments();
  res.json({ exists: count > 0 });
});

// Create the one-and-only admin (blocked if already created)
router.post('/setup', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const count = await Admin.countDocuments();
  if (count > 0) {
    return res.status(403).json({
      message: 'Admin already exists. Create admin is disabled.',
    });
  }

  const hashed = await bcrypt.hash(String(password), 12);
  const admin = await Admin.create({
    username: String(username).trim().toLowerCase(),
    password: hashed,
  });

  const token = signToken(admin);
  res.status(201).json({
    message: 'Admin created',
    token,
    admin: { id: String(admin._id), username: admin.username },
  });
});

// Admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const admin = await Admin.findOne({
    username: String(username).trim().toLowerCase(),
  }).select('+password');

  if (!admin) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const ok = await bcrypt.compare(String(password), admin.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = signToken(admin);
  res.json({
    token,
    admin: { id: String(admin._id), username: admin.username },
  });
});

// Current admin (protected)
router.get('/me', requireAdmin, async (req, res) => {
  res.json(req.admin);
});

module.exports = router;
