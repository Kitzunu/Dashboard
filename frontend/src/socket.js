import { io } from 'socket.io-client';

const DEFAULT_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const DEFAULT_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const BASE_URL = import.meta.env.VITE_API_URL || `${DEFAULT_PROTOCOL}//${DEFAULT_HOST}:3001`;

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(BASE_URL, { auth: { token } });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
