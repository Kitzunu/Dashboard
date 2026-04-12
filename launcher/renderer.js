// ── State ────────────────────────────────────────────────────────
let services = {};
let activeService = null;    // 'agent' | 'backend' | 'frontend'
let activeGameServer = null; // 'authserver' | 'worldserver' | etc.
let autoScroll = true;
let gameServerStatus = null; // last polled status from agent

// ── DOM refs ─────────────────────────────────────────────────────
const $cards          = document.getElementById('service-cards');
const $gameCards      = document.getElementById('game-server-cards');
const $agentHint      = document.getElementById('agent-status-hint');
const $logOutput      = document.getElementById('log-output');
const $logTitle       = document.getElementById('log-title');
const $chkScroll      = document.getElementById('chk-autoscroll');

// ── Init ─────────────────────────────────────────────────────────
(async () => {
  services = await window.api.listServices();
  renderCards();

  // Select first service by default
  const firstId = Object.keys(services)[0];
  if (firstId) selectService(firstId);

  // Check if agent is already running and fetch initial game server status
  const gsStatus = await window.api.getGameServerStatus();
  if (gsStatus) {
    gameServerStatus = gsStatus;
    renderGameCards();
  }
})();

// ── Event listeners ──────────────────────────────────────────────
document.getElementById('btn-start-all').addEventListener('click', () => window.api.startAll());
document.getElementById('btn-stop-all').addEventListener('click', () => window.api.stopAll());
document.getElementById('btn-open-dash').addEventListener('click', () => window.api.openDashboard());
document.getElementById('btn-open-folder').addEventListener('click', () => window.api.openRoot());
document.getElementById('btn-clear-log').addEventListener('click', () => {
  if (activeGameServer) {
    // Game server logs are fetched from agent, just clear the display
    $logOutput.innerHTML = '<div class="log-empty">No logs yet</div>';
    return;
  }
  if (!activeService) return;
  window.api.clearLogs(activeService);
  services[activeService].logs = [];
  renderLogs();
});

$chkScroll.addEventListener('change', (e) => { autoScroll = e.target.checked; });

// ── Settings modal ───────────────────────────────────────────────
const $modal    = document.getElementById('settings-modal');
const $backdrop = $modal.querySelector('.modal-backdrop');

document.getElementById('btn-settings').addEventListener('click', async () => {
  const s = await window.api.getSettings();
  document.getElementById('set-autostart').checked  = s.autoStart || false;
  document.getElementById('set-tray').checked        = s.minimizeToTray !== false;
  document.getElementById('set-minimized').checked   = s.startMinimized || false;
  $modal.classList.remove('hidden');
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  window.api.setSettings({
    autoStart:      document.getElementById('set-autostart').checked,
    minimizeToTray: document.getElementById('set-tray').checked,
    startMinimized: document.getElementById('set-minimized').checked,
  });
  $modal.classList.add('hidden');
});

document.getElementById('btn-cancel-settings').addEventListener('click', () => $modal.classList.add('hidden'));
$backdrop.addEventListener('click', () => $modal.classList.add('hidden'));

// ── IPC listeners ────────────────────────────────────────────────
window.api.onStatus((id, status) => {
  if (services[id]) services[id].status = status;
  renderCards();
});

window.api.onLog((id, entry) => {
  if (!services[id]) return;
  services[id].logs.push(entry);
  if (services[id].logs.length > 2000) services[id].logs.shift();
  if (id === activeService && !activeGameServer) appendLogLine(entry);
});

// ── Game server status polling ───────────────────────────────────
window.api.onGameServerStatus((status) => {
  gameServerStatus = status;
  renderGameCards();
});

// ── Live game server console lines via SSE ───────────────────────
window.api.onGameServerConsole((server, line) => {
  if (server === activeGameServer) {
    const empty = $logOutput.querySelector('.log-empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = 'log-line stdout';
    const ts = new Date().toLocaleTimeString();
    el.innerHTML = `<span class="ts">${ts}</span>${escapeHtml(line)}`;
    $logOutput.appendChild(el);
    if (autoScroll) scrollToBottom();
  }
});

// ── Rendering ────────────────────────────────────────────────────
function renderCards() {
  $cards.innerHTML = '';
  for (const [id, svc] of Object.entries(services)) {
    const card = document.createElement('div');
    card.className = `service-card${id === activeService && !activeGameServer ? ' active' : ''}`;
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectService(id);
    });

    const isRunning  = svc.status === 'running';
    const isStopped  = svc.status === 'stopped' || svc.status === 'error';
    const isBusy     = svc.status === 'starting' || svc.status === 'stopping';

    card.innerHTML = `
      <div class="service-card-header">
        <span class="service-name">${svc.label}</span>
        <span class="status-badge ${svc.status}">${svc.status}</span>
      </div>
      <div class="service-card-actions">
        <button class="btn btn-success btn-xs btn-svc-start" ${!isStopped ? 'disabled' : ''}>Start</button>
        <button class="btn btn-danger btn-xs btn-svc-stop" ${!isRunning ? 'disabled' : ''}>Stop</button>
        <button class="btn btn-xs btn-svc-restart" ${isBusy ? 'disabled' : ''}>Restart</button>
      </div>
    `;

    card.querySelector('.btn-svc-start').addEventListener('click', () => window.api.startService(id));
    card.querySelector('.btn-svc-stop').addEventListener('click', () => window.api.stopService(id));
    card.querySelector('.btn-svc-restart').addEventListener('click', () => window.api.restartService(id));

    $cards.appendChild(card);
  }
}

function selectService(id) {
  activeService = id;
  activeGameServer = null;
  $logTitle.textContent = services[id]?.label || id;
  $logTitle.style.color = 'var(--text)';
  renderCards();
  renderGameCards();
  updateConsoleInput();
  renderLogs();
}

// ── Game server rendering ────────────────────────────────────────
function renderGameCards() {
  if (!gameServerStatus) {
    $agentHint.textContent = 'agent not running';
    $agentHint.className = 'section-hint';
    $gameCards.innerHTML = '<div class="log-empty" style="font-size:11px; padding:8px 0;">Start the Server Agent to manage game servers</div>';
    return;
  }

  $agentHint.textContent = 'connected';
  $agentHint.className = 'section-hint connected';
  $gameCards.innerHTML = '';

  // Build list: authserver first, then worldservers
  const entries = [];
  for (const [name, info] of Object.entries(gameServerStatus)) {
    if (name === 'uptime') continue;
    entries.push({ name, ...info });
  }

  // Sort: authserver first
  entries.sort((a, b) => {
    if (a.name === 'authserver') return -1;
    if (b.name === 'authserver') return 1;
    return a.name.localeCompare(b.name);
  });

  for (const srv of entries) {
    const card = document.createElement('div');
    const isActive = activeGameServer === srv.name;
    card.className = `service-card${isActive ? ' active' : ''}`;
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectGameServer(srv.name);
    });

    const isRunning = srv.running === true;
    const statusText = isRunning ? 'running' : 'stopped';
    const uptimeStr = isRunning && srv.startTime ? formatUptime(Date.now() - srv.startTime) : '';
    const displayName = srv.name === 'authserver' ? 'Auth Server' : prettifyName(srv.name);

    card.innerHTML = `
      <div class="service-card-header">
        <span class="service-name">${escapeHtml(displayName)}</span>
        <span class="status-badge ${statusText}">${statusText}</span>
      </div>
      <div class="service-card-actions">
        <button class="btn btn-success btn-xs btn-gs-start" ${isRunning ? 'disabled' : ''}>Start</button>
        <button class="btn btn-danger btn-xs btn-gs-stop" ${!isRunning ? 'disabled' : ''}>Stop</button>
      </div>
      ${uptimeStr ? `<div class="service-card-meta"><span>Uptime: ${uptimeStr}</span>${srv.pid ? `<span>PID: ${srv.pid}</span>` : ''}</div>` : ''}
    `;

    card.querySelector('.btn-gs-start').addEventListener('click', async () => {
      const res = await window.api.startGameServer(srv.name);
      if (!res.success) console.error('Start failed:', res.error);
    });

    card.querySelector('.btn-gs-stop').addEventListener('click', async () => {
      const res = await window.api.stopGameServer(srv.name, 'exit');
      if (!res.success) console.error('Stop failed:', res.error);
    });

    $gameCards.appendChild(card);
  }
}

async function selectGameServer(name) {
  activeGameServer = name;
  activeService = null;
  const displayName = name === 'authserver' ? 'Auth Server' : prettifyName(name);
  $logTitle.textContent = displayName;
  $logTitle.style.color = 'var(--text)';
  renderCards();
  renderGameCards();
  updateConsoleInput();

  // Fetch logs from agent
  $logOutput.innerHTML = '<div class="log-empty">Loading logs...</div>';
  const result = await window.api.getGameServerLogs(name);
  if (activeGameServer !== name) return; // selection changed

  $logOutput.innerHTML = '';
  const logs = result.logs || [];
  if (logs.length === 0) {
    $logOutput.innerHTML = '<div class="log-empty">No logs yet</div>';
    return;
  }
  const now = new Date().toLocaleTimeString();
  const frag = document.createDocumentFragment();
  for (const line of logs) {
    const text = typeof line === 'string' ? line : (line.text || line);
    const el = document.createElement('div');
    el.className = 'log-line stdout';
    el.innerHTML = `<span class="ts">${now}</span>${escapeHtml(text)}`;
    frag.appendChild(el);
  }
  $logOutput.appendChild(frag);
  scrollToBottom();
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function prettifyName(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderLogs() {
  if (activeGameServer) return; // game server logs handled separately
  $logOutput.innerHTML = '';
  const svc = services[activeService];
  if (!svc || svc.logs.length === 0) {
    $logOutput.innerHTML = '<div class="log-empty">No logs yet</div>';
    return;
  }
  // Use document fragment for performance
  const frag = document.createDocumentFragment();
  for (const entry of svc.logs) {
    frag.appendChild(createLogEl(entry));
  }
  $logOutput.appendChild(frag);
  scrollToBottom();
}

function appendLogLine(entry) {
  // Remove "no logs" placeholder
  const empty = $logOutput.querySelector('.log-empty');
  if (empty) empty.remove();

  $logOutput.appendChild(createLogEl(entry));
  if (autoScroll) scrollToBottom();
}

function createLogEl(entry) {
  const el = document.createElement('div');
  el.className = `log-line ${entry.stream}`;
  const ts = new Date(entry.ts).toLocaleTimeString();
  el.innerHTML = `<span class="ts">${ts}</span>${escapeHtml(entry.text)}`;
  return el;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    $logOutput.scrollTop = $logOutput.scrollHeight;
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Console input for game servers ───────────────────────────────
const $consoleBar   = document.getElementById('console-input-bar');
const $consoleInput = document.getElementById('console-input');
const $btnSendCmd   = document.getElementById('btn-send-cmd');
const cmdHistory = [];
let cmdHistoryIdx = -1;

function updateConsoleInput() {
  // Show console input only for worldservers (not authserver, not dashboard services)
  const show = activeGameServer && activeGameServer !== 'authserver';
  $consoleBar.classList.toggle('hidden', !show);
  if (show) $consoleInput.focus();
}

async function sendCommand() {
  const cmd = $consoleInput.value.trim();
  if (!cmd || !activeGameServer) return;

  cmdHistory.unshift(cmd);
  if (cmdHistory.length > 50) cmdHistory.pop();
  cmdHistoryIdx = -1;
  $consoleInput.value = '';

  const res = await window.api.sendGameCommand(cmd, activeGameServer);
  if (!res.success) {
    const el = document.createElement('div');
    el.className = 'log-line stderr';
    const ts = new Date().toLocaleTimeString();
    el.innerHTML = `<span class="ts">${ts}</span>${escapeHtml('Error: ' + (res.error || 'Command failed'))}`;
    $logOutput.appendChild(el);
    if (autoScroll) scrollToBottom();
  }
}

$btnSendCmd.addEventListener('click', sendCommand);

$consoleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendCommand();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdHistoryIdx < cmdHistory.length - 1) {
      cmdHistoryIdx++;
      $consoleInput.value = cmdHistory[cmdHistoryIdx];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (cmdHistoryIdx > 0) {
      cmdHistoryIdx--;
      $consoleInput.value = cmdHistory[cmdHistoryIdx];
    } else {
      cmdHistoryIdx = -1;
      $consoleInput.value = '';
    }
  }
});
