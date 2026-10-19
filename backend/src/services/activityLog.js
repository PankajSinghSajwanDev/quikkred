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

function adminActor(admin) {
  return {
    actorType: 'admin',
    actorId: String(admin.id),
    actorName: admin.name || admin.username || 'Admin',
    actorEmail: admin.email || admin.username || '',
  };
}

module.exports = { writeLog, memberActor, adminActor };
