const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { TeamMember } = require('../models/TeamMember');
const { Task } = require('../models/Task');
const { Notification } = require('../models/Notification');
const { requireUser } = require('../middleware/userAuth');
const { maybeNotifyAssignment } = require('../services/notify');
const { validateTask, validateLogin, sendValidation } = require('../lib/validation');
const { serializeUser, hasGrant } = require('../lib/rbac');

const router = express.Router();

function signUserToken(member) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { sub: String(member._id), role: 'user' },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function validateTaskBody(body, { partial = false } = {}) {
  return validateTask(body, { partial });
}

function requireGrant(resource, action) {
  return (req, res, next) => {
    if (!hasGrant(req.user?.permissions, resource, action)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

function refId(value) {
  if (!value) return '';
  return String(value._id || value);
}

function isOwnTask(task, userId) {
  return refId(task.assignedTo) === userId || refId(task.createdBy) === userId;
}

function canTrackTime(task, userId) {
  const assignee = refId(task.assignedTo);
  if (assignee) return assignee === userId;
  return refId(task.createdBy) === userId;
}

async function populateTask(id) {
  return Task.findById(id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');
}

// —— Auth ——
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const { errors } = validateLogin(req.body || {}, { emailLogin: true });
  if (sendValidation(res, errors)) return;

  const member = await TeamMember.findOne({
    email: String(email).trim().toLowerCase(),
  }).select('+password');

  if (!member || !member.password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const ok = await bcrypt.compare(String(password), member.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signUserToken(member);
  res.json({
    token,
    user: serializeUser(member),
  });
});

router.get('/me', requireUser, async (req, res) => {
  res.json(req.user);
});

router.get('/dashboard', requireUser, async (req, res) => {
  const userId = req.user.id;
  const [assigned, created, unread] = await Promise.all([
    Task.countDocuments({ assignedTo: userId }),
    Task.countDocuments({ createdBy: userId }),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  res.json({
    assignedTasks: assigned,
    createdTasks: created,
    unreadNotifications: unread,
  });
});

// Team list for assign dropdown
router.get('/team', requireUser, async (_req, res) => {
  const members = await TeamMember.find()
    .select('name email role number')
    .sort({ name: 1 });
  res.json(members);
});

router.get('/members', requireUser, requireGrant('team', 'read'), async (_req, res) => {
  const members = await TeamMember.find()
    .select('name email role number')
    .sort({ name: 1 });
  res.json(members);
});

// —— Tasks ——
router.get('/tasks', requireUser, async (req, res) => {
  const userId = req.user.id;
  const tasks = await Task.find({
    $or: [{ assignedTo: userId }, { createdBy: userId }],
  })
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role')
    .sort({ dueDate: 1 });
  res.json(tasks);
});

router.get('/tasks/:id', requireUser, async (req, res) => {
  const task = await populateTask(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const userId = req.user.id;
  const assignee = task.assignedTo ? String(task.assignedTo._id || task.assignedTo) : '';
  const creator = task.createdBy ? String(task.createdBy._id || task.createdBy) : '';
  if (assignee !== userId && creator !== userId) {
    return res.status(403).json({ message: 'Not allowed to view this task' });
  }
  res.json(task);
});

router.post('/tasks', requireUser, async (req, res) => {
  const { errors, data } = validateTaskBody(req.body || {});
  if (sendValidation(res, errors)) return;

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return sendValidation(res, { assignedTo: 'Assigned member not found' });
    }
  }

  data.createdBy = req.user.id;
  // Default assign to self if none chosen
  if (data.assignedTo === undefined) {
    data.assignedTo = req.user.id;
  }

  const task = await Task.create(data);
  const populated = await populateTask(task._id);

  await maybeNotifyAssignment({
    previousAssigneeId: null,
    nextAssigneeId: data.assignedTo,
    task: populated,
    assignedByName: req.user.name,
    skipUserId: req.user.id,
  });

  res.status(201).json(populated);
});

router.put('/tasks/:id', requireUser, async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const userId = req.user.id;
  const assignee = existing.assignedTo ? String(existing.assignedTo) : '';
  const creator = existing.createdBy ? String(existing.createdBy) : '';
  if (assignee !== userId && creator !== userId) {
    return res.status(403).json({ message: 'Not allowed to update this task' });
  }

  const { errors, data } = validateTaskBody(req.body || {}, { partial: true });
  if (sendValidation(res, errors)) return;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return sendValidation(res, { assignedTo: 'Assigned member not found' });
    }
  }

  const previousAssigneeId = existing.assignedTo;
  Object.assign(existing, data);
  await existing.save();

  const populated = await populateTask(existing._id);

  if (data.assignedTo !== undefined) {
    await maybeNotifyAssignment({
      previousAssigneeId,
      nextAssigneeId: data.assignedTo,
      task: populated,
      assignedByName: req.user.name,
      skipUserId: req.user.id,
    });
  }

  res.json(populated);
});

router.delete('/tasks/:id', requireUser, requireGrant('tasks', 'delete'), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  if (!isOwnTask(task, req.user.id)) {
    return res.status(403).json({ message: 'Not allowed to delete this task' });
  }
  await Task.findByIdAndDelete(task._id);
  res.json({ message: 'Task deleted' });
});

router.post('/tasks/:id/timer', requireUser, async (req, res) => {
  const action = String(req.body?.action || '').trim().toLowerCase();
  if (action !== 'start' && action !== 'stop') {
    return res.status(400).json({ message: 'Action must be start or stop' });
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  if (!canTrackTime(task, req.user.id)) {
    return res.status(403).json({ message: 'Only the assignee can track time' });
  }

  if (action === 'start') {
    if (task.status === 'done') {
      return res.status(400).json({ message: 'Completed tasks cannot be timed' });
    }
    if (task.timerStartedAt) {
      return res.status(400).json({ message: 'Timer is already running' });
    }
    task.timerStartedAt = new Date();
    if (task.status === 'todo') task.status = 'in_progress';
  } else {
    if (!task.timerStartedAt) {
      return res.status(400).json({ message: 'Timer is not running' });
    }
    const started = new Date(task.timerStartedAt).getTime();
    task.timeSpentMs = (Number(task.timeSpentMs) || 0) + Math.max(0, Date.now() - started);
    task.timerStartedAt = null;
  }

  await task.save();
  const populated = await populateTask(task._id);
  res.json(populated);
});

// —— Notifications ——
router.get('/notifications', requireUser, async (req, res) => {
  const items = await Notification.find({ user: req.user.id })
    .populate('task', 'title status priority dueDate')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(items);
});

router.get('/notifications/unread-count', requireUser, async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    read: false,
  });
  res.json({ count });
});

router.patch('/notifications/:id/read', requireUser, async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true },
    { new: true },
  ).populate('task', 'title status priority dueDate');
  if (!item) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  res.json(item);
});

router.post('/notifications/read-all', requireUser, async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { read: true },
  );
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
