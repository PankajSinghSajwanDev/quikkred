require('dotenv').config();
const mongoose = require('mongoose');
const { TeamMember } = require('../models/TeamMember');
const { Task } = require('../models/Task');
const { Notification } = require('../models/Notification');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in backend/.env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const [tasks, notifications, members] = await Promise.all([
    Task.deleteMany({}),
    Notification.deleteMany({}),
    TeamMember.deleteMany({}),
  ]);

  console.log(`Deleted tasks: ${tasks.deletedCount}`);
  console.log(`Deleted notifications: ${notifications.deletedCount}`);
  console.log(`Deleted team members: ${members.deletedCount}`);
  console.log('Admin account kept as-is.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
