require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { TeamMember, TEAM_ROLES } = require('../models/TeamMember');
const { Task, TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { Notification } = require('../models/Notification');

const DEFAULT_USER_PASSWORD = 'User@123';

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Aadhya', 'Diya', 'Myra', 'Sara', 'Ira',
  'Anika', 'Pari', 'Navya', 'Kiara', 'Rohan', 'Kabir', 'Yash', 'Dev',
  'Meera', 'Riya', 'Neha', 'Kavya', 'Tanvi', 'Sneha',
];

const LAST = [
  'Sharma', 'Verma', 'Patel', 'Singh', 'Gupta', 'Mehta', 'Joshi', 'Nair',
  'Reddy', 'Iyer', 'Khan', 'Das', 'Roy', 'Malhotra', 'Kapoor',
];

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

  // Remove previous dummy seed (old @dummy… or teamN@gmail.com)
  const oldMembers = await TeamMember.find({
    $or: [
      { email: /@dummy\.quikkred\.test$/i },
      { email: /^team\d+@gmail\.com$/i },
    ],
  }).select('_id');
  const oldIds = oldMembers.map((m) => m._id);
  if (oldIds.length) {
    await Task.deleteMany({
      $or: [
        { assignedTo: { $in: oldIds } },
        { createdBy: { $in: oldIds } },
      ],
    });
    await Notification.deleteMany({ user: { $in: oldIds } });
    await TeamMember.deleteMany({ _id: { $in: oldIds } });
    console.log(`Cleared ${oldIds.length} previous dummy members + their tasks`);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 12);
  const members = [];
  for (let i = 0; i < 30; i += 1) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[i % LAST.length];
    const name = `${first} ${last}`;
    members.push({
      name,
      number: `9${String(800000000 + i).slice(0, 9)}`,
      email: `team${i + 1}@gmail.com`,
      role: TEAM_ROLES[i % TEAM_ROLES.length],
      password: passwordHash,
    });
  }

  const createdMembers = await TeamMember.insertMany(members);
  console.log(`Created ${createdMembers.length} team members`);

  const tasks = [];
  for (const member of createdMembers) {
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let t = 0; t < count; t += 1) {
      const title = `${pick(TASK_TITLES)} — ${member.name.split(' ')[0]}`;
      tasks.push({
        title,
        description: `Dummy task for ${member.name}. Role: ${member.role}. Auto-seeded for UI testing.`,
        dueDate: daysFromNow(1, 45),
        priority: pick(TASK_PRIORITIES),
        status: pick(TASK_STATUSES),
        assignedTo: member._id,
      });
    }
  }

  const createdTasks = await Task.insertMany(tasks);
  console.log(`Created ${createdTasks.length} tasks (2–3 per member)`);
  console.log(`User login password for all: ${DEFAULT_USER_PASSWORD}`);
  console.log('Example: team1@gmail.com / User@123');
  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
