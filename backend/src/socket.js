const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

/** @type {import('socket.io').Server | null} */
let io = null;

function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        '';
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('JWT_SECRET is not configured'));
      }
      const payload = jwt.verify(String(token), secret);
      if (payload.role !== 'user' || !payload.sub) {
        return next(new Error('User access only'));
      }
      socket.userId = String(payload.sub);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const room = `user:${socket.userId}`;
    void socket.join(room);
  });

  return io;
}

function getIo() {
  return io;
}

/** Push a live notification to a logged-in team member */
function pushNotificationToUser(userId, notification) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit('notification:new', {
    notification,
  });
}

module.exports = {
  initSocket,
  getIo,
  pushNotificationToUser,
};
