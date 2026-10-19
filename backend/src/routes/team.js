const express = require('express');
const bcrypt = require('bcrypt');
const {
  requireAdmin,
  requirePermission,
  requireAnyPermission,
} = require('../middleware/adminAuth');
const { TeamMember, TEAM_ROLES } = require('../models/TeamMember');
const { validateMember, sendValidation, password } = require('../lib/validation');
const { isSuperAdmin } = require('../lib/rbac');

const router = express.Router();
const DEFAULT_USER_PASSWORD = 'User@123';
const MIN_TEAM_PASSWORD_LEN = 4;

router.use(requireAdmin);

function validateBody(body, { partial = false, passwordRequired = false } = {}) {
  return validateMember(body, { partial, passwordRequired });
}

router.get(
  '/roles',
  requireAnyPermission([
    ['team', 'read'],
    ['team', 'create'],
    ['team', 'update'],
    ['tasks', 'read'],
    ['tasks', 'create'],
    ['tasks', 'update'],
  ]),
  (_req, res) => {
    res.json({ roles: TEAM_ROLES });
  },
);

router.get(
  '/',
  requireAnyPermission([
    ['team', 'read'],
    ['team', 'create'],
    ['team', 'update'],
    ['team', 'delete'],
    ['tasks', 'read'],
    ['tasks', 'create'],
    ['tasks', 'update'],
  ]),
  async (_req, res) => {
    const members = await TeamMember.find().sort({ createdAt: -1 });
    res.json(members);
  },
);

router.get(
  '/:id',
  requireAnyPermission([
    ['team', 'read'],
    ['team', 'update'],
  ]),
  async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) {
    return res.status(404).json({ message: 'Team member not found' });
  }
  res.json(member);
});

router.post('/', requirePermission('team', 'create'), async (req, res) => {
  const { errors, data } = validateBody(req.body || {}, { passwordRequired: true });
  if (sendValidation(res, errors)) return;
  if (!isSuperAdmin(req.admin)) {
    delete data.permissions;
  }

  const provided = req.body?.password ? String(req.body.password) : '';
  const pwdErr = password(provided, { min: MIN_TEAM_PASSWORD_LEN });
  if (pwdErr) {
    return sendValidation(res, { password: pwdErr });
  }
  const rawPassword = provided || DEFAULT_USER_PASSWORD;

  try {
    data.password = await bcrypt.hash(rawPassword, 12);
    const member = await TeamMember.create(data);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 11000) {
      return sendValidation(res, { email: 'This email is already in use' }, 409);
    }
    throw err;
  }
});

router.put('/:id', requirePermission('team', 'update'), async (req, res) => {
  const { errors, data } = validateBody(req.body || {}, { partial: true });
  if (sendValidation(res, errors)) return;
  if (!isSuperAdmin(req.admin)) {
    delete data.permissions;
  }

  if (req.body?.password) {
    const pwdErr = password(req.body.password, { min: MIN_TEAM_PASSWORD_LEN });
    if (pwdErr) {
      return sendValidation(res, { password: pwdErr });
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
      return sendValidation(res, { email: 'This email is already in use' }, 409);
    }
    throw err;
  }
});

router.delete('/:id', requirePermission('team', 'delete'), async (req, res) => {
  const member = await TeamMember.findByIdAndDelete(req.params.id);
  if (!member) {
    return res.status(404).json({ message: 'Team member not found' });
  }
  res.json({ message: 'Team member deleted' });
});

module.exports = router;
