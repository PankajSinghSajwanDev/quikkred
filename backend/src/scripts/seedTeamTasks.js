require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { TeamMember } = require('../models/TeamMember');
const { Task, TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');

const TASK_TITLES = [
  'Fix login validation',
  'Update dashboard cards',
  'Write API tests',
  'Design landing hero',
  'Setup CI pipeline',
  'Refactor team routes',
  'Improve search UX',
  'Add pagination',
  'Optimize Mongo queries',
  'Review PR feedback',
  'Document admin flow',
  'Build notification toast',
  'Sync assignee filter',
  'Polish mobile sidebar',
  'Seed demo data',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysFromNow(min, max) {
  const days = min + Math.floor(Math.random() * (max - min + 1));
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in backend/.env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const members = await TeamMember.find({
    email: /^team\d+@gmail\.com$/i,
  }).sort({ email: 1 });

  if (!members.length) {
    throw new Error('No team1…team20 members found. Run seedTeam20 first.');
  }

  // Ensure passwords match teamN pattern (team1, team2, …)
  for (const member of members) {
    const match = member.email.match(/^team(\d+)@gmail\.com$/i);
    if (!match) continue;
    const plain = `team${match[1]}`;
    member.password = await bcrypt.hash(plain, 12);
    await member.save();
  }
  console.log(`Reset passwords for ${members.length} members (team1, team2, …)`);

  // Clear old tasks for these members, then assign 2–3 each
  const ids = members.map((m) => m._id);
  const cleared = await Task.deleteMany({
    $or: [{ assignedTo: { $in: ids } }, { createdBy: { $in: ids } }],
  });
  console.log(`Cleared ${cleared.deletedCount} old tasks`);

  const tasks = [];
  for (const member of members) {
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let t = 0; t < count; t += 1) {
      tasks.push({
        title: `${pick(TASK_TITLES)} — ${member.name.split(' ')[0]}`,
        description: `Assigned to ${member.name} (${member.email}).`,
        dueDate: daysFromNow(1, 40),
        priority: pick(TASK_PRIORITIES),
        status: pick(TASK_STATUSES),
        assignedTo: member._id,
        createdBy: null,
      });
    }
  }

  const created = await Task.insertMany(tasks);
  console.log(`Created ${created.length} tasks (2–3 per member)`);
  console.log('Login: team1@gmail.com / team1');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
