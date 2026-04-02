/**
 * Server bridge — connects the dashboard backend to the server agent's SSE
 * stream and forwards real-time events (console lines, server status changes)
 * to frontend Socket.IO clients.
 *
 * Uses only Node's built-in `http` module; no extra dependencies.
 */

const http         = require('http');
const EventEmitter = require('events');

const emitter = new EventEmitter();

let frontendIO   = null;
let connected    = false;
let reconnectTimer = null;

function agentHost() { return '127.0.0.1'; }
function agentPort() { return parseInt(process.env.AGENT_PORT, 10) || 3002; }
function agentSecret() { return process.env.AGENT_SECRET || 'changeme'; }

/** Call once from server.js, passing the frontend-facing Socket.IO instance. */
function init(io) {
  frontendIO = io;
  connect();
}

function connect() {
  const req = http.request({
    hostname: agentHost(),
    port:     agentPort(),
    path:     '/events',
    method:   'GET',
    headers:  { 'X-Agent-Token': agentSecret() },
  });

  req.on('response', (res) => {
    if (res.statusCode !== 200) {
      res.resume(); // drain
      scheduleReconnect();
      return;
    }

    connected = true;
    emitter.emit('agent-connected');
    console.log('[server-bridge] Connected to server agent');

    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { handleEvent(JSON.parse(line.slice(6))); } catch {}
        }
      }
    });

    res.on('end', () => {
      connected = false;
      console.log('[server-bridge] Agent event stream ended');
      emitter.emit('agent-disconnected');
      notifyServersDown();
      scheduleReconnect();
    });

    res.on('error', () => {
      connected = false;
      emitter.emit('agent-disconnected');
      notifyServersDown();
      scheduleReconnect();
    });
  });

  req.on('error', () => {
    connected = false;
    emitter.emit('agent-disconnected');
    scheduleReconnect();
  });

  req.end();
}

function handleEvent(event) {
  if (!frontendIO) return;

  switch (event.type) {
    case 'init':
      // Sync initial server status to all frontend clients
      if (event.worldserver) frontendIO.emit('server-status', { server: 'worldserver', running: event.worldserver.running });
      if (event.authserver)  frontendIO.emit('server-status', { server: 'authserver',  running: event.authserver.running  });
      break;

    case 'console-line':
      frontendIO.to(`console-${event.server}`).emit('console-line', { server: event.server, line: event.line });
      break;

    case 'server-status':
      frontendIO.emit('server-status', { server: event.server, running: event.running });
      emitter.emit('server-status', { server: event.server, running: event.running });
      break;
  }
}

function notifyServersDown() {
  if (!frontendIO) return;
  frontendIO.emit('server-status', { server: 'worldserver', running: false });
  frontendIO.emit('server-status', { server: 'authserver',  running: false });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function isConnected() { return connected; }

module.exports = { init, isConnected, on: emitter.on.bind(emitter), off: emitter.off.bind(emitter) };
