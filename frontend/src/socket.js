import { io } from 'socket.io-client';

const DEFAULT_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${DEFAULT_HOST}:3001`;

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(BASE_URL, { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
