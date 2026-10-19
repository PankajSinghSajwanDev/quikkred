require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { connectDb } = require('./config/db');
const { initSocket } = require('./socket');
const adminRoutes = require('./routes/admin');
const subAdminRoutes = require('./routes/subAdmins');
const teamRoutes = require('./routes/team');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/admin/sub-admins', subAdminRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/team', teamRoutes);
app.use('/admin/tasks', taskRoutes);
app.use('/user', userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  await connectDb();
  const server = http.createServer(app);
  initSocket(server, CORS_ORIGIN);
  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
