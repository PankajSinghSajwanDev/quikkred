const { ActivityLog } = require('../models/ActivityLog');

async function writeLog(entry) {
  try {
    await ActivityLog.create(entry);
  } catch (err) {
    console.error('Failed to write activity log', err.message);
  }
}

function memberActor(user) {
  return {
    actorType: 'member',
    actorId: String(user.id),
    actorName: user.name || user.email || 'Member',
    actorEmail: user.email || '',
  };
}

module.exports = { writeLog, memberActor };
