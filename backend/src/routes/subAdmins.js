const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const {
  requireAdmin,
  requireSuperAdmin,
} = require('../middleware/adminAuth');
const {
  RESOURCES,
  ACTIONS,
  normalizePermissions,
  countGranted,
  serializeAdmin,
} = require('../lib/rbac');
const {
  username: usernameRule,
  password: passwordRule,
  sendValidation,
} = require('../lib/validation');

const router = express.Router();
const MIN_PASSWORD_LEN = 8;

router.use(requireAdmin);
router.use(requireSuperAdmin);

function publicSubAdmin(admin) {
  const serialized = serializeAdmin(admin);
  return {
    ...serialized,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    createdBy: admin.createdBy ? String(admin.createdBy) : null,
  };
}

router.get('/meta', (_req, res) => {
  res.json({ resources: RESOURCES, actions: ACTIONS });
});

router.get('/', async (_req, res) => {
  const items = await Admin.find({ role: 'sub_admin' }).sort({ createdAt: -1 });
  res.json(items.map(publicSubAdmin));
});

router.get('/:id', async (req, res) => {
  const item = await Admin.findOne({ _id: req.params.id, role: 'sub_admin' });
  if (!item) {
    return res.status(404).json({ message: 'Sub-admin not found' });
  }
  res.json(publicSubAdmin(item));
});

router.post('/', async (req, res) => {
  const { username, password, permissions, active } = req.body || {};

  const fieldErrors = {
    username: usernameRule(username),
    password: passwordRule(password, { min: MIN_PASSWORD_LEN }),
  };
  const normalized = normalizePermissions(permissions);
  if (countGranted(normalized) === 0) {
    fieldErrors.permissions =
      'Select at least one permission (create, read, update, or delete)';
  }
  if (sendValidation(res, fieldErrors)) return;

  try {
    const item = await Admin.create({
      username: String(username).trim().toLowerCase(),
      password: await bcrypt.hash(String(password), 12),
      role: 'sub_admin',
      permissions: normalized,
      active: active === false ? false : true,
      createdBy: req.admin.id,
    });
    res.status(201).json(publicSubAdmin(item));
  } catch (err) {
    if (err.code === 11000) {
      return sendValidation(res, { username: 'This username is already in use' }, 409);
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const item = await Admin.findOne({ _id: req.params.id, role: 'sub_admin' });
  if (!item) {
    return res.status(404).json({ message: 'Sub-admin not found' });
  }

  const { username, password, permissions, active } = req.body || {};
  const data = {};

  const fieldErrors = {};

  if (username !== undefined) {
    const err = usernameRule(username);
    if (err) fieldErrors.username = err;
    else data.username = String(username).trim().toLowerCase();
  }

  if (password) {
    const err = passwordRule(password, { min: MIN_PASSWORD_LEN });
    if (err) fieldErrors.password = err;
    else data.password = await bcrypt.hash(String(password), 12);
  }

  if (permissions !== undefined) {
    const normalized = normalizePermissions(permissions);
    if (countGranted(normalized) === 0) {
      fieldErrors.permissions =
        'Select at least one permission (create, read, update, or delete)';
    } else {
      data.permissions = normalized;
    }
  }

  if (sendValidation(res, fieldErrors)) return;

  if (active !== undefined) {
    data.active = Boolean(active);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    Object.assign(item, data);
    await item.save();
    res.json(publicSubAdmin(item));
  } catch (err) {
    if (err.code === 11000) {
      return sendValidation(res, { username: 'This username is already in use' }, 409);
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.admin.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const item = await Admin.findOneAndDelete({
    _id: req.params.id,
    role: 'sub_admin',
  });
  if (!item) {
    return res.status(404).json({ message: 'Sub-admin not found' });
  }
  res.json({ message: 'Sub-admin deleted' });
});

module.exports = router;
