const express = require('express');
const {
  requireAdmin,
  requirePermission,
  requireAnyPermission,
} = require('../middleware/adminAuth');
const { Task, TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { TeamMember } = require('../models/TeamMember');
const { maybeNotifyAssignment } = require('../services/notify');
const { validateTask, validateTaskUpdate, sendValidation } = require('../lib/validation');
const { adminActor } = require('../services/activityLog');
const {
  listTaskUpdates,
  addTaskUpdate,
  deleteUpdatesForTask,
} = require('../services/taskUpdates');

const router = express.Router();

router.use(requireAdmin);

function validateBody(body, { partial = false } = {}) {
  return validateTask(body, { partial });
}

router.get(
  '/meta',
  requireAnyPermission([
    ['tasks', 'read'],
    ['tasks', 'create'],
    ['tasks', 'update'],
  ]),
  (_req, res) => {
    res.json({
      priorities: TASK_PRIORITIES,
      statuses: TASK_STATUSES,
    });
  },
);

router.get(
  '/',
  requireAnyPermission([
    ['tasks', 'read'],
    ['tasks', 'update'],
    ['tasks', 'delete'],
  ]),
  async (_req, res) => {
  const tasks = await Task.find()
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role')
    .sort({ dueDate: 1 });
  res.json(tasks);
});

router.get(
  '/:id',
  requireAnyPermission([
    ['tasks', 'read'],
    ['tasks', 'update'],
    ['tasks', 'delete'],
  ]),
  async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json(task);
});

router.get(
  '/:id/updates',
  requireAnyPermission([
    ['tasks', 'read'],
    ['tasks', 'update'],
    ['tasks', 'delete'],
  ]),
  async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(await listTaskUpdates(task._id));
  },
);

router.post(
  '/:id/updates',
  requireAnyPermission([
    ['tasks', 'read'],
    ['tasks', 'update'],
    ['tasks', 'delete'],
  ]),
  async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const { errors, data } = validateTaskUpdate(req.body || {});
    if (sendValidation(res, errors)) return;

    const update = await addTaskUpdate({
      task,
      actor: adminActor(req.admin),
      message: data.message,
      etaMinutes: data.etaMinutes,
    });
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role number')
      .populate('createdBy', 'name email role');
    res.status(201).json({ update, task: populated });
  },
);

router.post('/', requirePermission('tasks', 'create'), async (req, res) => {
  const { errors, data } = validateBody(req.body || {});
  if (sendValidation(res, errors)) return;

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return sendValidation(res, { assignedTo: 'Assigned member not found' });
    }
  }

  const task = await Task.create(data);
  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');

  await maybeNotifyAssignment({
    previousAssigneeId: null,
    nextAssigneeId: data.assignedTo,
    task: populated,
    assignedByName: req.admin?.username
      ? `Admin (${req.admin.username})`
      : 'Admin',
    skipUserId: null,
  });

  res.status(201).json(populated);
});

router.put('/:id', requirePermission('tasks', 'update'), async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const { errors, data } = validateBody(req.body || {}, { partial: true });
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
  const task = await Task.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');

  if (data.assignedTo !== undefined) {
    await maybeNotifyAssignment({
      previousAssigneeId,
      nextAssigneeId: data.assignedTo,
      task,
      assignedByName: req.admin?.username
        ? `Admin (${req.admin.username})`
        : 'Admin',
      skipUserId: null,
    });
  }

  res.json(task);
});

router.delete('/:id', requirePermission('tasks', 'delete'), async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  await deleteUpdatesForTask(task._id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
