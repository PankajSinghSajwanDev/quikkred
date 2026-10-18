const express = require('express');
const bcrypt = require('bcrypt');
const { requireAdmin } = require('../middleware/adminAuth');
const { TeamMember, TEAM_ROLES } = require('../models/TeamMember');

const router = express.Router();
const DEFAULT_USER_PASSWORD = 'User@123';
const MIN_TEAM_PASSWORD_LEN = 4;

router.use(requireAdmin);

function validateBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) {
      errors.push('Name is required');
    } else {
      data.name = String(body.name).trim();
    }
  }

  if (!partial || body.number !== undefined) {
    if (!body.number || !String(body.number).trim()) {
      errors.push('Number is required');
    } else {
      data.number = String(body.number).trim();
    }
  }

  if (!partial || body.email !== undefined) {
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required');
    } else {
      data.email = email;
    }
  }

  if (!partial || body.role !== undefined) {
    if (!body.role || !TEAM_ROLES.includes(body.role)) {
      errors.push(`Role must be one of: ${TEAM_ROLES.join(', ')}`);
    } else {
      data.role = body.role;
    }
  }

  return { errors, data };
}

router.get('/roles', (_req, res) => {
  res.json({ roles: TEAM_ROLES });
});

router.get('/', async (_req, res) => {
  const members = await TeamMember.find().sort({ createdAt: -1 });
  res.json(members);
});

router.get('/:id', async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) {
    return res.status(404).json({ message: 'Team member not found' });
  }
  res.json(member);
});

router.post('/', async (req, res) => {
  const { errors, data } = validateBody(req.body || {});
  if (errors.length) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  const provided = req.body?.password ? String(req.body.password) : '';
  if (provided && provided.length < MIN_TEAM_PASSWORD_LEN) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_TEAM_PASSWORD_LEN} characters`,
    });
  }
  const rawPassword = provided || DEFAULT_USER_PASSWORD;

  try {
    data.password = await bcrypt.hash(rawPassword, 12);
    const member = await TeamMember.create(data);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { errors, data } = validateBody(req.body || {}, { partial: true });
  if (errors.length) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  if (req.body?.password) {
    if (String(req.body.password).length < MIN_TEAM_PASSWORD_LEN) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_TEAM_PASSWORD_LEN} characters`,
      });
    }
    data.password = await bcrypt.hash(String(req.body.password), 12);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const member = await TeamMember.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    res.json(member);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const member = await TeamMember.findByIdAndDelete(req.params.id);
  if (!member) {
    return res.status(404).json({ message: 'Team member not found' });
  }
  res.json({ message: 'Team member deleted' });
});

module.exports = router;
