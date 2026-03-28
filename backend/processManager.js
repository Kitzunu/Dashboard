const { spawn } = require('child_process');
const path = require('path');

// Strip ANSI escape codes from server output
const ANSI_RE = /\x1B\[[0-9;]*[mGKHF]/g;
function stripAnsi(str) {
  return str.replace(ANSI_RE, '');
}

const processes = { worldserver: null, authserver: null };
const processLogs = { worldserver: [], authserver: [] };
const MAX_LOG_LINES = 2000;

let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function emitLog(serverName, raw) {
  const line = stripAnsi(raw.toString());
  processLogs[serverName].push(line);
  if (processLogs[serverName].length > MAX_LOG_LINES) {
    processLogs[serverName].shift();
  }
  if (io) {
    io.to(`console-${serverName}`).emit('console-line', { server: serverName, line });
  }
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
    const cwd = workDir || path.dirname(exePath);
    const proc = spawn(exePath, [], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false,
    });

    processes[serverName] = proc;
    processLogs[serverName] = [`[Dashboard] Starting ${serverName} from ${exePath}\n`];

    proc.stdout.on('data', (data) => emitLog(serverName, data));
    proc.stderr.on('data', (data) => emitLog(serverName, data));

    proc.on('close', (code) => {
      emitLog(serverName, `\n[Dashboard] Process exited with code ${code}\n`);
      processes[serverName] = null;
      if (io) io.emit('server-status', { server: serverName, running: false });
    });

    proc.on('error', (err) => {
      emitLog(serverName, `\n[Dashboard] Failed to start: ${err.message}\n`);
      processes[serverName] = null;
      if (io) io.emit('server-status', { server: serverName, running: false });
    });

    if (io) io.emit('server-status', { server: serverName, running: true });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function stopServer(serverName) {
  const proc = processes[serverName];
  if (!proc) return { success: false, error: 'Server is not running' };
  proc.kill();
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
  return { running: processes[serverName] !== null };
}

function getLogs(serverName) {
  return processLogs[serverName] || [];
}

module.exports = { setIO, startServer, stopServer, sendCommand, getStatus, getLogs };
