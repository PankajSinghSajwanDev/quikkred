require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { connectDb } = require('./config/db');
const { initSocket } = require('./socket');
const { globalLimiter } = require('./middleware/rateLimit');
const { singleFlight } = require('./middleware/singleFlight');
const { securityHeaders, jsonErrorHandler } = require('./middleware/security');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/user');
const logRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3001;

/** Comma-separated list, e.g. http://localhost:3000,https://quikkred.netlify.app */
function parseCorsOrigins(value) {
  const list = String(value || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

const CORS_ORIGINS = parseCorsOrigins(process.env.CORS_ORIGIN);

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use(securityHeaders);
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(globalLimiter);
app.use(singleFlight);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/admin', adminRoutes);
app.use('/admin/team', teamRoutes);
app.use('/admin/tasks', taskRoutes);
app.use('/admin/logs', logRoutes);
app.use('/user', userRoutes);

app.use(jsonErrorHandler);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  await connectDb();
  const server = http.createServer(app);
  initSocket(server, CORS_ORIGINS);
  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
