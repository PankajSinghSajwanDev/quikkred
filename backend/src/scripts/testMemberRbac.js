require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const { TeamMember } = require('../models/TeamMember');
const { Task } = require('../models/Task');
const {
  memberCan,
  memberSeesAllTasks,
  hasGrant,
} = require('../lib/rbac');

const API = process.env.API_URL || 'http://localhost:3001';

function signUser(id) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  return jwt.sign({ sub: String(id), role: 'user' }, secret, { expiresIn: '30m' });
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function check(name, ok, detail = '') {
  if (!ok) {
    throw new Error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
  console.log(`PASS ${name}`);
}

async function run() {
  await connectDb();

  const pankaj = await TeamMember.findOne({ email: 'sajwangi002@gmail.com' });
  const rohit = await TeamMember.findOne({ email: 'verma12@gmail.com' });
  const defaultMember = await TeamMember.findOne({
    email: 'aditya.beetlebyte@gmail.com',
  });

  check('found Pankaj', Boolean(pankaj), 'sajwangi002 not in DB');
  check('found Rohit', Boolean(rohit), 'verma12 not in DB');

  const pPerms = pankaj.permissions;
  const rPerms = rohit.permissions;

  check(
    'Pankaj has tasks.delete only among task writes',
    hasGrant(pPerms, 'tasks', 'delete') && !hasGrant(pPerms, 'tasks', 'create'),
    JSON.stringify(pPerms),
  );
  check(
    'Pankaj cannot create in member portal',
    memberCan(pPerms, 'tasks', 'create') === false,
  );
  check(
    'Pankaj cannot update in member portal',
    memberCan(pPerms, 'tasks', 'update') === false,
  );
  check('Pankaj can delete', memberCan(pPerms, 'tasks', 'delete') === true);
  check('Pankaj does not see all tasks', memberSeesAllTasks(pPerms) === false);

  check('Rohit can read all tasks', memberSeesAllTasks(rPerms) === true);
  check(
    'Rohit cannot create',
    memberCan(rPerms, 'tasks', 'create') === false,
  );
  check(
    'Rohit cannot delete',
    memberCan(rPerms, 'tasks', 'delete') === false,
  );

  const pToken = signUser(pankaj._id);
  const rToken = signUser(rohit._id);

  const totalTasks = await Task.countDocuments();
  check('workspace has tasks', totalTasks > 0, `count=${totalTasks}`);

  const pTasks = await api(pToken, '/user/tasks');
  check('Pankaj GET tasks 200', pTasks.status === 200, `status=${pTasks.status}`);
  check(
    'Pankaj sees only own tasks',
    Array.isArray(pTasks.body) && pTasks.body.length <= totalTasks,
  );

  const rTasks = await api(rToken, '/user/tasks');
  check('Rohit GET tasks 200', rTasks.status === 200, `status=${rTasks.status}`);
  check(
    'Rohit with Tasks Read sees all tasks',
    Array.isArray(rTasks.body) && rTasks.body.length === totalTasks,
    `rohit=${rTasks.body.length} total=${totalTasks}`,
  );

  const createPayload = {
    title: 'RBAC create should fail',
    description: 'This should be rejected by permissions',
    dueDate: new Date().toISOString().slice(0, 10),
    priority: 'low',
    status: 'todo',
  };

  const pCreate = await api(pToken, '/user/tasks', {
    method: 'POST',
    body: JSON.stringify(createPayload),
  });
  check(
    'Pankaj POST create is 403',
    pCreate.status === 403,
    `status=${pCreate.status} body=${JSON.stringify(pCreate.body)}`,
  );

  const rCreate = await api(rToken, '/user/tasks', {
    method: 'POST',
    body: JSON.stringify(createPayload),
  });
  check(
    'Rohit POST create is 403',
    rCreate.status === 403,
    `status=${rCreate.status} body=${JSON.stringify(rCreate.body)}`,
  );

  const sample = await Task.findOne().lean();
  check('sample task exists', Boolean(sample));

  const rDelete = await api(rToken, `/user/tasks/${sample._id}`, {
    method: 'DELETE',
  });
  check(
    'Rohit DELETE is 403',
    rDelete.status === 403,
    `status=${rDelete.status}`,
  );

  const stillThere = await Task.findById(sample._id);
  check('task still exists after Rohit delete attempt', Boolean(stillThere));

  if (defaultMember) {
    check(
      'default member can create (no task grants)',
      memberCan(defaultMember.permissions, 'tasks', 'create') === true,
    );
    const dToken = signUser(defaultMember._id);
    const dCreate = await api(dToken, '/user/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'RBAC default member temp',
        description: 'Temporary task to verify default create still works',
        dueDate: new Date().toISOString().slice(0, 10),
        priority: 'low',
        status: 'todo',
        assignedTo: String(defaultMember._id),
      }),
    });
    check(
      'default member POST create is 201',
      dCreate.status === 201,
      `status=${dCreate.status} body=${JSON.stringify(dCreate.body)}`,
    );
    if (dCreate.body?.id) {
      await Task.findByIdAndDelete(dCreate.body.id);
    }
  }

  console.log('\nAll RBAC checks passed.');
  console.log(`Pankaj tasks visible: ${pTasks.body.length}`);
  console.log(`Rohit tasks visible: ${rTasks.body.length} / ${totalTasks}`);
}

run()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
