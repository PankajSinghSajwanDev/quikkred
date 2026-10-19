'use client';

import { io, type Socket } from 'socket.io-client';
import { getUserToken } from '@/lib/userApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getUserSocket() {
  return socket;
}

export function connectUserSocket() {
  const token = getUserToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1200,
  });

  return socket;
}

export function disconnectUserSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
