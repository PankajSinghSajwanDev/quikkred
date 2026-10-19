const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { TeamMember } = require('../models/TeamMember');
const { Task } = require('../models/Task');
const { Notification } = require('../models/Notification');
const { requireUser } = require('../middleware/userAuth');
const { maybeNotifyAssignment } = require('../services/notify');
const { validateTask, validateTaskUpdate, validateLogin, sendValidation } = require('../lib/validation');
const { serializeUser, hasGrant, memberCan, memberSeesAllTasks } = require('../lib/rbac');
const { writeLog, memberActor } = require('../services/activityLog');
const { authLimiter } = require('../middleware/rateLimit');
const {
  listTaskUpdates,
  addTaskUpdate,
  deleteUpdatesForTask,
} = require('../services/taskUpdates');

const router = express.Router();
const DUMMY_HASH = bcrypt.hashSync('__invalid_login__', 10);

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

function canTrackTime(task, user) {
  const userId = user?.id;
  if (!userId) return false;
  // Assignee, creator, or members with tasks.update can track time.
  if (refId(task.assignedTo) === userId || refId(task.createdBy) === userId) {
    return true;
  }
  return memberCan(user.permissions, 'tasks', 'update');
}

function canPostTaskUpdate(task, user) {
  return isOwnTask(task, user.id) || memberCan(user.permissions, 'tasks', 'update');
}

async function populateTask(id) {
  return Task.findById(id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');
}

// —— Auth ——
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const { errors } = validateLogin(req.body || {}, { emailLogin: true });
  if (sendValidation(res, errors)) return;

  const member = await TeamMember.findOne({
    email: String(email).trim().toLowerCase(),
  }).select('+password');

  if (!member || !member.password) {
    await bcrypt.compare(String(password || ''), DUMMY_HASH);
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
  const filter = memberSeesAllTasks(req.user.permissions)
    ? {}
    : { $or: [{ assignedTo: userId }, { createdBy: userId }] };
  const tasks = await Task.find(filter)
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
  if (!memberSeesAllTasks(req.user.permissions) && !isOwnTask(task, req.user.id)) {
    return res.status(403).json({ message: 'Not allowed to view this task' });
  }
  res.json(task);
});

router.get('/tasks/:id/updates', requireUser, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  if (!memberSeesAllTasks(req.user.permissions) && !isOwnTask(task, req.user.id)) {
    return res.status(403).json({ message: 'Not allowed to view this task' });
  }
  res.json(await listTaskUpdates(task._id));
});

router.post('/tasks/:id/updates', requireUser, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  if (!memberSeesAllTasks(req.user.permissions) && !isOwnTask(task, req.user.id)) {
    return res.status(403).json({ message: 'Not allowed to view this task' });
  }
  if (!canPostTaskUpdate(task, req.user)) {
    return res.status(403).json({ message: 'Not allowed to post an update' });
  }

  const { errors, data } = validateTaskUpdate(req.body || {});
  if (sendValidation(res, errors)) return;

  const update = await addTaskUpdate({
    task,
    actor: memberActor(req.user),
    message: data.message,
    etaMinutes: data.etaMinutes,
  });
  const populated = await populateTask(task._id);
  res.status(201).json({ update, task: populated });
});

router.post('/tasks', requireUser, async (req, res) => {
  if (!memberCan(req.user.permissions, 'tasks', 'create')) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
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

  await writeLog({
    ...memberActor(req.user),
    action: 'task_create',
    task: task._id,
    taskTitle: populated.title,
    message: `${req.user.name} created task “${populated.title}”`,
  });

  res.status(201).json(populated);
});

router.put('/tasks/:id', requireUser, async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const canEdit =
    memberCan(req.user.permissions, 'tasks', 'update') ||
    isOwnTask(existing, req.user.id);
  if (!canEdit) {
    return res.status(403).json({ message: 'Not allowed to update this task' });
  }

  // Staff without update grant may only change status on their own tasks.
  if (
    !memberCan(req.user.permissions, 'tasks', 'update') &&
    isOwnTask(existing, req.user.id)
  ) {
    const allowed = Object.keys(req.body || {}).every((key) => key === 'status');
    if (!allowed) {
      return res.status(403).json({ message: 'Not allowed to update this task' });
    }
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

  await writeLog({
    ...memberActor(req.user),
    action: 'task_update',
    task: existing._id,
    taskTitle: populated.title,
    message: `${req.user.name} updated task “${populated.title}”`,
  });

  res.json(populated);
});

router.delete('/tasks/:id', requireUser, requireGrant('tasks', 'delete'), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const title = task.title;
  await deleteUpdatesForTask(task._id);
  await Task.findByIdAndDelete(task._id);
  await writeLog({
    ...memberActor(req.user),
    action: 'task_delete',
    task: task._id,
    taskTitle: title,
    message: `${req.user.name} deleted task “${title}”`,
  });
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
  if (!canTrackTime(task, req.user)) {
    return res.status(403).json({ message: 'Not allowed to track time on this task' });
  }

  if (action === 'start') {
    if (task.timerStartedAt) {
      return res.status(400).json({ message: 'Timer is already running' });
    }
    task.timerStartedAt = new Date();
    if (task.status === 'todo' || task.status === 'done') {
      task.status = 'in_progress';
    }
  } else {
    if (!task.timerStartedAt) {
      return res.status(400).json({ message: 'Timer is not running' });
    }
    const started = new Date(task.timerStartedAt).getTime();
    const durationMs = Math.max(0, Date.now() - started);
    task.timeSpentMs = (Number(task.timeSpentMs) || 0) + durationMs;
    task.timerStartedAt = null;
    req._timerDurationMs = durationMs;
  }

  await task.save();
  const populated = await populateTask(task._id);
  const durationMs = Number(req._timerDurationMs) || 0;
  await writeLog({
    ...memberActor(req.user),
    action: action === 'start' ? 'timer_start' : 'timer_stop',
    task: task._id,
    taskTitle: populated.title,
    message:
      action === 'start'
        ? `${req.user.name} started time on “${populated.title}”`
        : `${req.user.name} stopped time on “${populated.title}”`,
    meta: action === 'stop' ? { durationMs } : {},
  });
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
