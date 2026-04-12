const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
let store;
async function initStore() {
  const { default: Store } = await import('electron-store');
  store = new Store();
}
const ROOT = path.resolve(__dirname, '..');
const IS_WIN = process.platform === 'win32';

// ── Load .env for agent connection ───────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  const vars = {};
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env missing is fine */ }
  return vars;
}

const env = loadEnv();
const AGENT_PORT   = env.AGENT_PORT   || process.env.AGENT_PORT   || '3002';
const AGENT_SECRET = env.AGENT_SECRET || process.env.AGENT_SECRET || 'changeme';

// ── Service definitions ──────────────────────────────────────────
const SERVICE_DEFS = {
  agent:    { label: 'Server Agent',  cmd: 'node', args: ['runAgent.js'],  cwd: path.join(ROOT, 'backend') },
  backend:  { label: 'Backend API',   cmd: 'node', args: ['run.js'],       cwd: path.join(ROOT, 'backend') },
  frontend: { label: 'Frontend',      cmd: 'npm',  args: ['run', 'dev'],   cwd: path.join(ROOT, 'frontend') },
};

const services = {};   // { [id]: { proc, status, logs[] } }
const MAX_LOG_LINES = 2000;

let mainWindow = null;
let tray = null;

// ── Helpers ──────────────────────────────────────────────────────
function send(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// Strip logger timestamp prefix: "2026-04-11 14:30:45 INFO  [comp] msg" → "INFO  [comp] msg"
const LOG_TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} /;

function pushLog(id, text, stream = 'stdout') {
  if (!services[id]) return;
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const raw of lines) {
    const line = raw.replace(LOG_TS_RE, '');
    services[id].logs.push({ ts: Date.now(), stream, text: line });
    if (services[id].logs.length > MAX_LOG_LINES) services[id].logs.shift();
    send('service:log', id, { ts: Date.now(), stream, text: line });
  }
}

function setStatus(id, status) {
  if (!services[id]) services[id] = { proc: null, status: 'stopped', logs: [] };
  services[id].status = status;
  send('service:status', id, status);
}

function npmCmd() {
  return IS_WIN ? 'npm.cmd' : 'npm';
}

// ── Service management ───────────────────────────────────────────
function startService(id) {
  if (services[id]?.proc) return;

  const def = SERVICE_DEFS[id];
  if (!def) return;

  const cmd = def.cmd === 'npm' ? npmCmd() : def.cmd;
  setStatus(id, 'starting');
  pushLog(id, `Starting ${def.label}...`, 'system');

  const spawnArgs = IS_WIN
    ? [cmd, ...def.args].join(' ')   // single command string for shell
    : cmd;
  const proc = spawn(spawnArgs, IS_WIN ? [] : def.args, {
    cwd: def.cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: IS_WIN,
    windowsHide: true,
  });

  services[id].proc = proc;

  proc.stdout.on('data', (data) => {
    pushLog(id, data.toString(), 'stdout');
    // Detect when services are actually ready
    const text = data.toString();
    if (id === 'agent' && text.includes('listening on'))   { setStatus(id, 'running'); startGameServerPolling(); }
    if (id === 'backend' && text.includes('listening on')) setStatus(id, 'running');
    if (id === 'frontend' && text.includes('Local:'))      setStatus(id, 'running');
  });

  proc.stderr.on('data', (data) => {
    pushLog(id, data.toString(), 'stderr');
  });

  proc.on('error', (err) => {
    pushLog(id, `Error: ${err.message}`, 'stderr');
    setStatus(id, 'error');
    services[id].proc = null;
  });

  proc.on('close', (code) => {
    pushLog(id, `Process exited with code ${code}`, 'system');
    services[id].proc = null;
    if (id === 'agent') stopGameServerPolling();
    if (services[id].status !== 'stopping') {
      setStatus(id, code === 0 ? 'stopped' : 'error');
    } else {
      setStatus(id, 'stopped');
    }
  });

  // Mark as running after a timeout if no detection string found
  setTimeout(() => {
    if (services[id]?.status === 'starting') {
      setStatus(id, 'running');
      if (id === 'agent') startGameServerPolling();
    }
  }, 8000);
}

function stopService(id) {
  const svc = services[id];
  if (!svc?.proc) return;

  setStatus(id, 'stopping');
  pushLog(id, `Stopping ${SERVICE_DEFS[id].label}...`, 'system');

  if (IS_WIN) {
    // On Windows, spawn taskkill to kill the entire process tree
    spawn('taskkill', ['/pid', svc.proc.pid.toString(), '/T', '/F'], { windowsHide: true });
  } else {
    svc.proc.kill('SIGTERM');
    setTimeout(() => { if (svc.proc) svc.proc.kill('SIGKILL'); }, 5000);
  }
}

function restartService(id) {
  const svc = services[id];
  if (svc?.proc) {
    // Stop then start
    const onStopped = () => {
      if (services[id]?.status === 'stopped' || services[id]?.status === 'error') {
        clearInterval(poll);
        startService(id);
      }
    };
    const poll = setInterval(onStopped, 200);
    setTimeout(() => clearInterval(poll), 10000);
    stopService(id);
  } else {
    startService(id);
  }
}

function stopAllServices() {
  return new Promise((resolve) => {
    const ids = Object.keys(SERVICE_DEFS);
    // Stop in reverse order: frontend, backend, agent
    for (const id of [...ids].reverse()) stopService(id);

    const check = setInterval(() => {
      const allStopped = ids.every(id => !services[id]?.proc);
      if (allStopped) { clearInterval(check); resolve(); }
    }, 200);
    setTimeout(() => { clearInterval(check); resolve(); }, 10000);
  });
}

// ── IPC handlers ─────────────────────────────────────────────────
ipcMain.handle('services:list', () => {
  const result = {};
  for (const [id, def] of Object.entries(SERVICE_DEFS)) {
    result[id] = {
      id,
      label: def.label,
      status: services[id]?.status || 'stopped',
      logs: services[id]?.logs || [],
    };
  }
  return result;
});

ipcMain.on('service:start', (_, id) => startService(id));
ipcMain.on('service:stop', (_, id) => stopService(id));
ipcMain.on('service:restart', (_, id) => restartService(id));

ipcMain.on('services:startAll', () => {
  // Start in order: agent, backend, frontend
  startService('agent');
  setTimeout(() => startService('backend'), 1000);
  setTimeout(() => startService('frontend'), 2000);
});

ipcMain.on('services:stopAll', () => {
  for (const id of ['frontend', 'backend', 'agent']) stopService(id);
});

ipcMain.on('service:clearLogs', (_, id) => {
  if (services[id]) services[id].logs = [];
});

// ── Game server management (via Server Agent HTTP API) ───────────
function agentRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: parseInt(AGENT_PORT, 10),
      path: urlPath,
      method,
      headers: {
        'x-agent-token': AGENT_SECRET,
        'Content-Type': 'application/json',
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let gameServerPollTimer = null;
let sseRequest = null;

function startGameServerPolling() {
  if (gameServerPollTimer) return;
  pollGameServers();
  gameServerPollTimer = setInterval(pollGameServers, 3000);
  connectSSE();
}

function stopGameServerPolling() {
  if (gameServerPollTimer) { clearInterval(gameServerPollTimer); gameServerPollTimer = null; }
  disconnectSSE();
}

async function pollGameServers() {
  try {
    const status = await agentRequest('GET', '/status');
    send('gameServers:status', status);
  } catch {
    send('gameServers:status', null);
  }
}

// ── SSE stream for live game server console output ───────────────
function connectSSE() {
  if (sseRequest) return;

  const opts = {
    hostname: '127.0.0.1',
    port: parseInt(AGENT_PORT, 10),
    path: '/events',
    method: 'GET',
    headers: { 'x-agent-token': AGENT_SECRET },
  };

  const req = http.request(opts, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      // Parse SSE frames
      const parts = buffer.split('\n\n');
      buffer = parts.pop(); // keep incomplete frame
      for (const part of parts) {
        if (!part.trim() || part.startsWith(': heartbeat')) continue;
        const dataLine = part.split('\n').find(l => l.startsWith('data: '));
        if (!dataLine) continue;
        try {
          const evt = JSON.parse(dataLine.slice(6));
          if (evt.type === 'console-line') {
            send('gameServers:consoleLine', evt.server, evt.line);
          }
        } catch { /* ignore parse errors */ }
      }
    });
    res.on('end', () => {
      sseRequest = null;
      // Reconnect if still polling
      if (gameServerPollTimer) setTimeout(connectSSE, 2000);
    });
  });

  req.on('error', () => {
    sseRequest = null;
    if (gameServerPollTimer) setTimeout(connectSSE, 3000);
  });

  req.end();
  sseRequest = req;
}

function disconnectSSE() {
  if (sseRequest) { sseRequest.destroy(); sseRequest = null; }
}

ipcMain.handle('gameServers:getStatus', async () => {
  try {
    return await agentRequest('GET', '/status');
  } catch {
    return null;
  }
});

ipcMain.handle('gameServers:start', async (_, name) => {
  try {
    return await agentRequest('POST', `/${name}/start`);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gameServers:stop', async (_, name, mode) => {
  try {
    return await agentRequest('POST', `/${name}/stop`, { mode: mode || 'exit' });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gameServers:getLogs', async (_, name) => {
  try {
    return await agentRequest('GET', `/${name}/logs`);
  } catch (err) {
    return { logs: [], error: err.message };
  }
});

ipcMain.handle('gameServers:command', async (_, command, server) => {
  try {
    return await agentRequest('POST', '/command', { command, server });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gameServers:autoRestart', async (_, name, enabled) => {
  try {
    return await agentRequest('POST', `/${name}/autorestart`, { enabled });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('open:dashboard', () => {
  shell.openExternal('http://localhost:5173');
});

ipcMain.on('open:root', () => {
  shell.openPath(ROOT);
});

ipcMain.handle('settings:get', () => {
  return store.get('launcherSettings', { autoStart: false, minimizeToTray: true, startMinimized: false });
});

ipcMain.on('settings:set', (_, settings) => {
  store.set('launcherSettings', settings);
});

// ── Window creation ──────────────────────────────────────────────
function createWindow() {
  const bounds = store.get('windowBounds', { width: 960, height: 680 });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 780,
    minHeight: 500,
    title: 'AC Dashboard Launcher',
    backgroundColor: '#0d0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (e) => {
    const settings = store.get('launcherSettings', {});
    if (settings.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('resize', () => saveBounds());
  mainWindow.on('move', () => saveBounds());
}

function saveBounds() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    store.set('windowBounds', mainWindow.getBounds());
  }
}

function createTray() {
  // Create a simple 16x16 tray icon programmatically
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVQ4T2P8z8Dwn4EIwMjAwMBEjHqwGhZiDGBkYGBgxGcAMz4XkOwCFkIMYCHGEGwuYCHGNYxEuICJkQRDyA4DYlzAwsSAHJdEG0J2GBDjAhZCBjCREwYAEjQTEQklKRYAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);
  tray.setToolTip('AC Dashboard Launcher');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Launcher', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Start All', click: () => ipcMain.emit('services:startAll') },
    { label: 'Stop All', click: () => ipcMain.emit('services:stopAll') },
    { type: 'separator' },
    { label: 'Open Dashboard', click: () => shell.openExternal('http://localhost:5173') },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

// ── App lifecycle ────────────────────────────────────────────────
app.whenReady().then(async () => {
  await initStore();

  // Initialize service state
  for (const id of Object.keys(SERVICE_DEFS)) {
    services[id] = { proc: null, status: 'stopped', logs: [] };
  }

  createWindow();
  createTray();

  const settings = store.get('launcherSettings', {});
  if (settings.startMinimized) mainWindow.hide();
  if (settings.autoStart) {
    startService('agent');
    setTimeout(() => startService('backend'), 1000);
    setTimeout(() => startService('frontend'), 2000);
  }
});

app.on('before-quit', async (e) => {
  if (!app.isQuitting) {
    e.preventDefault();
    app.isQuitting = true;
    await stopAllServices();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
