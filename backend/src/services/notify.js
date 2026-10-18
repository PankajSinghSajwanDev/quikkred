const { Notification } = require('../models/Notification');
const { pushNotificationToUser } = require('../socket');

/**
 * Notify a team member that a task was assigned to them.
 * Skips if assignee is missing or is the same as the person who assigned.
 */
async function notifyTaskAssigned({
  assigneeId,
  task,
  assignedByName = 'Someone',
}) {
  if (!assigneeId || !task) return null;

  const assignee = String(assigneeId);
  const title = task.title || 'a task';

  const notification = await Notification.create({
    user: assignee,
    type: 'task_assigned',
    title: 'Task assigned to you',
    message: `${assignedByName} assigned “${title}” to you.`,
    task: task._id || task.id || null,
    read: false,
  });

  // Live push to open team sessions (no page refresh needed)
  pushNotificationToUser(assignee, notification.toJSON());

  return notification;
}

/**
 * If assignedTo changed to a new member, send a notification.
 */
async function maybeNotifyAssignment({
  previousAssigneeId,
  nextAssigneeId,
  task,
  assignedByName,
  skipUserId,
}) {
  if (!nextAssigneeId) return null;

  const next = String(nextAssigneeId);
  const prev = previousAssigneeId ? String(previousAssigneeId) : '';
  if (next === prev) return null;
  if (skipUserId && next === String(skipUserId)) return null;

  return notifyTaskAssigned({
    assigneeId: next,
    task,
    assignedByName,
  });
}

module.exports = {
  notifyTaskAssigned,
  maybeNotifyAssignment,
};
