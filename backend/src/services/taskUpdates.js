const { TaskUpdate } = require('../models/TaskUpdate');
const { writeLog } = require('./activityLog');

const MAX_ETA_MINUTES = 90 * 24 * 60;

function parseEtaMinutes(value) {
  if (value === undefined || value === null || value === '') {
    return { etaMinutes: undefined };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > MAX_ETA_MINUTES) {
    return { error: 'Enter a valid estimate (1 minute to 90 days)' };
  }
  return { etaMinutes: Math.round(n) };
}

async function listTaskUpdates(taskId) {
  return TaskUpdate.find({ task: taskId }).sort({ createdAt: -1 }).limit(100);
}

async function addTaskUpdate({
  task,
  actor,
  message,
  etaMinutes,
}) {
  const doc = await TaskUpdate.create({
    task: task._id,
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorEmail: actor.actorEmail || '',
    message,
    etaMinutes: etaMinutes ?? null,
  });

  if (etaMinutes != null) {
    task.etaMinutes = etaMinutes;
    await task.save();
  }

  const etaLabel = etaMinutes != null ? ` · ETA ${etaMinutes} min` : '';
  await writeLog({
    ...actor,
    action: 'task_note',
    task: task._id,
    taskTitle: task.title,
    message: `${actor.actorName} posted an update on “${task.title}”${etaLabel}`,
    meta: etaMinutes != null ? { etaMinutes } : {},
  });

  return doc;
}

async function deleteUpdatesForTask(taskId) {
  await TaskUpdate.deleteMany({ task: taskId });
}

module.exports = {
  MAX_ETA_MINUTES,
  parseEtaMinutes,
  listTaskUpdates,
  addTaskUpdate,
  deleteUpdatesForTask,
};
