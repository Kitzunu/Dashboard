const { spawn } = require('child_process');
const path = require('path');

// Strip non-color escape sequences (cursor movement, mode setting, OSC, etc.)
// but preserve SGR color codes (\x1B[...m) for frontend rendering.
function processOutput(str) {
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

let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function emitLog(serverName, raw) {
  const line = processOutput(raw.toString());
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
    stopping[serverName] = false;
    const cwd = workDir || path.dirname(exePath);
    const proc = spawn(exePath, [], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false,
    });

    processes[serverName] = proc;
    startTimes[serverName] = Date.now();
    processLogs[serverName] = [`[Dashboard] Starting ${serverName} from ${exePath}\n`];

    proc.stdout.on('data', (data) => emitLog(serverName, data));
    proc.stderr.on('data', (data) => emitLog(serverName, data));

    proc.on('close', (code) => {
      emitLog(serverName, `\n[Dashboard] Process exited with code ${code}\n`);
      processes[serverName] = null;
      startTimes[serverName] = null;
      if (io) io.emit('server-status', { server: serverName, running: false });

      if (autoRestart[serverName] && !stopping[serverName]) {
        emitLog(serverName, `[Dashboard] Auto-restart enabled — restarting ${serverName} in 5 seconds…\n`);
        setTimeout(() => startServer(serverName), 5000);
      }
      stopping[serverName] = false;
    });

    proc.on('error', (err) => {
      emitLog(serverName, `\n[Dashboard] Failed to start: ${err.message}\n`);
      processes[serverName] = null;
      startTimes[serverName] = null;
      if (io) io.emit('server-status', { server: serverName, running: false });
      stopping[serverName] = false;
    });

    if (io) io.emit('server-status', { server: serverName, running: true });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// mode: 'exit' | 'shutdown'
// delay: seconds (only used with 'shutdown')
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
    } catch {
      proc.kill();
    }
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
    running: processes[serverName] !== null,
    autoRestart: autoRestart[serverName],
    pid: processes[serverName]?.pid || null,
    startTime: startTimes[serverName],
  };
}

function getLogs(serverName) {
  return processLogs[serverName] || [];
}

module.exports = { setIO, startServer, stopServer, setAutoRestart, sendCommand, getStatus, getLogs };
