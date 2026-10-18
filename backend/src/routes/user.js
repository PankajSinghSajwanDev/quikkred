const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { TeamMember } = require('../models/TeamMember');
const { Task, TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { Notification } = require('../models/Notification');
const { requireUser } = require('../middleware/userAuth');
const { maybeNotifyAssignment } = require('../services/notify');

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
  const errors = [];
  const data = {};

  if (!partial || body.title !== undefined) {
    if (!body.title || !String(body.title).trim()) {
      errors.push('Title is required');
    } else {
      data.title = String(body.title).trim();
    }
  }

  if (!partial || body.description !== undefined) {
    if (!body.description || !String(body.description).trim()) {
      errors.push('Description is required');
    } else {
      data.description = String(body.description).trim();
    }
  }

  if (!partial || body.dueDate !== undefined) {
    const due = new Date(body.dueDate);
    if (!body.dueDate || Number.isNaN(due.getTime())) {
      errors.push('Valid due date is required');
    } else {
      data.dueDate = due;
    }
  }

  if (!partial || body.priority !== undefined) {
    if (!body.priority || !TASK_PRIORITIES.includes(body.priority)) {
      errors.push(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
    } else {
      data.priority = body.priority;
    }
  }

  if (!partial || body.status !== undefined) {
    if (!body.status || !TASK_STATUSES.includes(body.status)) {
      errors.push(`Status must be one of: ${TASK_STATUSES.join(', ')}`);
    } else {
      data.status = body.status;
    }
  }

  if (!partial || body.assignedTo !== undefined) {
    if (body.assignedTo === null || body.assignedTo === '') {
      data.assignedTo = null;
    } else {
      data.assignedTo = body.assignedTo;
    }
  }

  return { errors, data };
}

async function populateTask(id) {
  return Task.findById(id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');
}

// —— Auth ——
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

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
    user: {
      id: String(member._id),
      name: member.name,
      email: member.email,
      role: member.role,
      number: member.number,
    },
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
  if (errors.length) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return res.status(400).json({ message: 'Assigned team member not found' });
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
  if (errors.length) {
    return res.status(400).json({ message: errors.join(', ') });
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return res.status(400).json({ message: 'Assigned team member not found' });
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
