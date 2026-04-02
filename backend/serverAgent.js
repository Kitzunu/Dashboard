/**
 * Server Agent — standalone process that manages worldserver and authserver.
 *
 * Run independently of the dashboard backend so game servers survive a
 * dashboard restart:
 *
 *   node backend/serverAgent.js
 *
 * The dashboard backend connects to this agent via HTTP (REST) and an
 * SSE stream (/events) for real-time log forwarding.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const http    = require('http');
const { spawn } = require('child_process');
const path    = require('path');

const PORT   = parseInt(process.env.AGENT_PORT, 10) || 3002;
const SECRET = process.env.AGENT_SECRET || 'changeme';

// ── Process management ────────────────────────────────────────────────────────

function sanitizeOutput(str) {
  return str.toString()
    .replace(/\x1B\[[0-9;]*[ABCDEFGJKST]/g, '')
    .replace(/\x1B\[[0-9;]*[hl]/g, '')
    .replace(/\x1B\][^\x07]*\x07/g, '')
    .replace(/\x1B[^[\]m]/g, '');
}

const processes   = { worldserver: null, authserver: null };
const processLogs = { worldserver: [], authserver: [] };
const autoRestart = { worldserver: false, authserver: false };
const stopping    = { worldserver: false, authserver: false };
const startTimes  = { worldserver: null, authserver: null };
const MAX_LOG_LINES = 2000;

// SSE clients connected from the dashboard backend
const sseClients = new Set();

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const send of sseClients) {
    try { send(payload); } catch {}
  }
}

function emitLog(serverName, raw) {
  const line = sanitizeOutput(raw.toString());
  processLogs[serverName].push(line);
  if (processLogs[serverName].length > MAX_LOG_LINES) {
    processLogs[serverName].shift();
  }
  broadcast({ type: 'console-line', server: serverName, line });
}

function startServer(serverName) {
  if (processes[serverName]) {
    return { success: false, error: 'Server is already running' };
  }

  const exePath = serverName === 'worldserver'
    ? process.env.WORLDSERVER_PATH
    : process.env.AUTHSERVER_PATH;

  const workDir = serverName === 'worldserver'
    ? (process.env.WORLDSERVER_DIR || null)
    : (process.env.AUTHSERVER_DIR || null);

  if (!exePath) {
    return { success: false, error: `${serverName} path not configured in .env` };
  }

  try {
    stopping[serverName] = false;
    const cwd  = workDir || path.dirname(exePath);
    const proc = spawn(exePath, [], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false,
    });

    processes[serverName]   = proc;
    startTimes[serverName]  = Date.now();
    processLogs[serverName] = [`[Server Agent] Starting ${serverName} from ${exePath}\n`];

    proc.stdout.on('data', (d) => emitLog(serverName, d));
    proc.stderr.on('data', (d) => emitLog(serverName, d));

    proc.on('close', (code) => {
      emitLog(serverName, `\n[Server Agent] Process exited with code ${code}\n`);
      processes[serverName]  = null;
      startTimes[serverName] = null;
      broadcast({ type: 'server-status', server: serverName, running: false });

      if (autoRestart[serverName] && !stopping[serverName]) {
        emitLog(serverName, `[Server Agent] Auto-restart enabled — restarting in 5 seconds…\n`);
        setTimeout(() => startServer(serverName), 5000);
      }
      stopping[serverName] = false;
    });

    proc.on('error', (err) => {
      emitLog(serverName, `\n[Server Agent] Failed to start: ${err.message}\n`);
      processes[serverName]  = null;
      startTimes[serverName] = null;
      broadcast({ type: 'server-status', server: serverName, running: false });
      stopping[serverName] = false;
    });

    broadcast({ type: 'server-status', server: serverName, running: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function stopServer(serverName, mode = 'exit', delay = 0) {
  const proc = processes[serverName];
  if (!proc) return { success: false, error: 'Server is not running' };

  stopping[serverName] = true;

  if (serverName === 'worldserver') {
    try {
      if (mode === 'shutdown') {
        proc.stdin.write(`server shutdown ${delay}\n`);
      } else {
        proc.stdin.write('server exit\n');
      }
    } catch { proc.kill(); }
  } else {
    proc.kill();
  }

  return { success: true };
}

function setAutoRestart(serverName, enabled) {
  if (!(serverName in autoRestart)) return { success: false, error: 'Invalid server name' };
  autoRestart[serverName] = !!enabled;
  return { success: true };
}

function sendCommand(command) {
  const proc = processes['worldserver'];
  if (!proc) return { success: false, error: 'World server is not running' };
  try {
    proc.stdin.write(command + '\n');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getStatus(serverName) {
  return {
    running:     processes[serverName] !== null,
    autoRestart: autoRestart[serverName],
    pid:         processes[serverName]?.pid || null,
    startTime:   startTimes[serverName],
  };
}

// ── HTTP API ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Token auth on all routes
app.use((req, res, next) => {
  if (req.headers['x-agent-token'] !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

const VALID = ['worldserver', 'authserver'];

// GET /status
app.get('/status', (req, res) => {
  res.json({
    worldserver: getStatus('worldserver'),
    authserver:  getStatus('authserver'),
    uptime:      process.uptime(),
  });
});

// GET /:name/logs
app.get('/:name/logs', (req, res) => {
  const { name } = req.params;
  if (!VALID.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json({ logs: processLogs[name] });
});

// POST /:name/start
app.post('/:name/start', (req, res) => {
  const { name } = req.params;
  if (!VALID.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json(startServer(name));
});

// POST /:name/stop
app.post('/:name/stop', (req, res) => {
  const { name } = req.params;
  if (!VALID.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  const { mode = 'exit', delay = 0 } = req.body;
  res.json(stopServer(name, mode, parseInt(delay, 10) || 0));
});

// POST /:name/autorestart
app.post('/:name/autorestart', (req, res) => {
  const { name } = req.params;
  if (!VALID.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json(setAutoRestart(name, req.body.enabled));
});

// POST /command
app.post('/command', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });
  res.json(sendCommand(command));
});

// GET /events — SSE stream for the dashboard backend
app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Send a heartbeat so the client can detect a stale connection
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch {}
  }, 15000);

  const send = (payload) => res.write(payload);
  sseClients.add(send);

  // Send current status immediately so the client is in sync
  res.write(`data: ${JSON.stringify({ type: 'init', worldserver: getStatus('worldserver'), authserver: getStatus('authserver') })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(send);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server-agent] Server Agent listening on port ${PORT}`);
});
