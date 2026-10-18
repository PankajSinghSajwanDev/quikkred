require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { TeamMember, TEAM_ROLES } = require('../models/TeamMember');
const { Task } = require('../models/Task');
const { Notification } = require('../models/Notification');

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun',
  'Ananya', 'Diya', 'Myra', 'Ira', 'Kiara',
  'Rohan', 'Kabir', 'Yash', 'Dev', 'Meera',
  'Riya', 'Neha', 'Kavya', 'Tanvi', 'Sneha',
];

const LAST = [
  'Sharma', 'Verma', 'Patel', 'Singh', 'Gupta',
  'Mehta', 'Joshi', 'Nair', 'Reddy', 'Iyer',
  'Khan', 'Das', 'Roy', 'Malhotra', 'Kapoor',
  'Chopra', 'Bhat', 'Shah', 'Pillai', 'Rao',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in backend/.env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear previous teamN@gmail.com members (+ their tasks/notifications)
  const old = await TeamMember.find({
    email: /^team\d+@gmail\.com$/i,
  }).select('_id');
  const oldIds = old.map((m) => m._id);
  if (oldIds.length) {
    await Task.deleteMany({
      $or: [
        { assignedTo: { $in: oldIds } },
        { createdBy: { $in: oldIds } },
      ],
    });
    await Notification.deleteMany({ user: { $in: oldIds } });
    await TeamMember.deleteMany({ _id: { $in: oldIds } });
    console.log(`Cleared ${oldIds.length} previous team accounts`);
  }

  const members = [];
  for (let i = 1; i <= 20; i += 1) {
    const passwordPlain = `team${i}`;
    const password = await bcrypt.hash(passwordPlain, 12);
    members.push({
      name: `${FIRST[i - 1]} ${LAST[i - 1]}`,
      number: `90909090${String(i).padStart(2, '0')}`,
      email: `team${i}@gmail.com`,
      role: TEAM_ROLES[(i - 1) % TEAM_ROLES.length],
      password,
    });
  }

  const created = await TeamMember.insertMany(members);
  console.log(`Created ${created.length} team members`);
  console.log('Examples:');
  console.log('  team1@gmail.com / team1 / 9090909001');
  console.log('  team2@gmail.com / team2 / 9090909002');
  console.log('  …');
  console.log('  team20@gmail.com / team20 / 9090909020');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
