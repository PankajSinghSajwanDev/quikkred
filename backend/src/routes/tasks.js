const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { Task, TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { TeamMember } = require('../models/TeamMember');
const { maybeNotifyAssignment } = require('../services/notify');

const router = express.Router();

router.use(requireAdmin);

function validateBody(body, { partial = false } = {}) {
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

router.get('/meta', (_req, res) => {
  res.json({
    priorities: TASK_PRIORITIES,
    statuses: TASK_STATUSES,
  });
});

router.get('/', async (_req, res) => {
  const tasks = await Task.find()
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role')
    .sort({ dueDate: 1 });
  res.json(tasks);
});

router.get('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email role number')
    .populate('createdBy', 'name email role');
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json(task);
});

router.post('/', async (req, res) => {
  const { errors, data } = validateBody(req.body || {});
  if (errors.length) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  if (data.assignedTo) {
    const member = await TeamMember.findById(data.assignedTo);
    if (!member) {
      return res.status(400).json({ message: 'Assigned team member not found' });
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

router.put('/:id', async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const { errors, data } = validateBody(req.body || {}, { partial: true });
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

router.delete('/:id', async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json({ message: 'Task deleted' });
});

module.exports = router;
