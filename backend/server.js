require('dotenv').config({
  path: require('path').join(__dirname, '../.env'),
  quiet: true
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const playerRoutes = require('./routes/players');
const consoleRoutes = require('./routes/console');
const dbRoutes = require('./routes/db');
const banRoutes          = require('./routes/bans');
const ticketRoutes       = require('./routes/tickets');
const configRoutes       = require('./routes/config');
const overviewRoutes     = require('./routes/overview');
const announcementRoutes = require('./routes/announcements');
const autobroadcastRoutes= require('./routes/autobroadcast');
const accountRoutes      = require('./routes/accounts');
const servertoolsRoutes  = require('./routes/servertools');
const mailRoutes         = require('./routes/mail');
const thresholdsRoutes   = require('./routes/thresholds');
const bugreportRoutes    = require('./routes/bugreports');
const lagreportRoutes    = require('./routes/lagreports');
const mailserverRoutes   = require('./routes/mailserver');
const dbcRoutes          = require('./routes/dbc');
const channelRoutes      = require('./routes/channels');
const spamreportRoutes   = require('./routes/spamreports');
const auditLogRoutes         = require('./routes/auditLogRoutes');
const settingsRoutes         = require('./routes/settingsRoutes');
const mutesRoutes            = require('./routes/mutes');
const scheduledTasksRoutes   = require('./routes/scheduledTasks');
const guildsRoutes           = require('./routes/guilds');
const arenaRoutes            = require('./routes/arena');
const battlegroundRoutes     = require('./routes/battleground');
const charactersRoutes       = require('./routes/characters');
const namefiltersRoutes      = require('./routes/namefilters');
const envSettingsRoutes      = require('./routes/envSettings');
const dashboardManageRoutes  = require('./routes/dashboardManage');
const alertsRoutes           = require('./routes/alertsRoutes');
const pdumpRoutes            = require('./routes/pdump');
const changelogRoutes        = require('./routes/changelog');
const calendarRoutes         = require('./routes/calendar');
const backupsRoutes          = require('./routes/backups');
const healthcheckRoutes      = require('./routes/healthcheck');
const batchOperationsRoutes  = require('./routes/batchOperations');
const characterTransferRoutes= require('./routes/characterTransfer');
const notificationsRoutes    = require('./routes/notifications');
const analyticsRoutes        = require('./routes/analytics');
const sessionsRoutes         = require('./routes/sessions');
const alertLogger            = require('./alertLogger');
const scheduler              = require('./scheduler');
const { startRetentionJob } = require('./audit');
const playerHistory      = require('./playerHistory');
const resourceHistory    = require('./resourceHistory');
const latencyMonitor     = require('./latencyMonitor');
const { authenticateToken } = require('./middleware/auth');
const ipAllowlist = require('./middleware/ipAllowlist');
const processManager = require('./processManager');
const serverBridge   = require('./serverBridge');
const dbc = require('./dbc');
const wsConfig = require('./worldservers');

const app = express();
const httpServer = http.createServer(app);

// Re-read FRONTEND_URL from process.env each time so changes via the .env editor
// take effect immediately without a server restart.
function getFrontendOrigins() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Check whether a URL origin belongs to a private / LAN address. */
function isPrivateOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    // IPv4 private ranges: 10.x, 172.16-31.x, 192.168.x
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) return true;
    // IPv6 link-local / unique-local
    if (/^(fe80|fd[0-9a-f]{2}):/i.test(hostname)) return true;
  } catch {}
  return false;
}

function dynamicOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  const allowed = getFrontendOrigins();
  if (allowed.includes(origin)) return callback(null, true);
  // Always accept origins from private/LAN addresses so mobile devices on the
  // same network can connect.  CORS is a browser-level mechanism; actual access
  // control is handled by authentication and the IP allowlist middleware.
  if (isPrivateOrigin(origin)) return callback(null, true);
  console.warn(`[CORS] Rejected origin: ${origin}  (allowed: ${allowed.join(', ')})`);
  callback(null, false);
}

const io = new Server(httpServer, {
  cors: { origin: dynamicOrigin, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: dynamicOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(ipAllowlist);

// Serve backend/public so assets like the icon can be referenced from Discord webhooks
app.use('/img', require('express').static(require('path').join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, bridge: serverBridge.isConnected() });
});

app.use('/api/auth', authRoutes);
app.use('/api/servers', authenticateToken, serverRoutes);
app.use('/api/players', authenticateToken, playerRoutes);
app.use('/api/console', authenticateToken, consoleRoutes);
app.use('/api/db', authenticateToken, dbRoutes);
app.use('/api/overview',       authenticateToken, overviewRoutes);
app.use('/api/announcements',  authenticateToken, announcementRoutes);
app.use('/api/autobroadcast',  authenticateToken, autobroadcastRoutes);
app.use('/api/accounts',       authenticateToken, accountRoutes);
app.use('/api/bans',           authenticateToken, banRoutes);
app.use('/api/tickets',        authenticateToken, ticketRoutes);
app.use('/api/config',         authenticateToken, configRoutes);
app.use('/api/servertools',    authenticateToken, servertoolsRoutes);
app.use('/api/mail',           authenticateToken, mailRoutes);
app.use('/api/thresholds',     authenticateToken, thresholdsRoutes);
app.use('/api/bugreports',    authenticateToken, bugreportRoutes);
app.use('/api/lagreports',    authenticateToken, lagreportRoutes);
app.use('/api/mailserver',    authenticateToken, mailserverRoutes);
app.use('/api/dbc',           authenticateToken, dbcRoutes);
app.use('/api/channels',     authenticateToken, channelRoutes);
app.use('/api/spamreports',  authenticateToken, spamreportRoutes);
app.use('/api/audit-log',    authenticateToken, auditLogRoutes);
app.use('/api/settings',     authenticateToken, settingsRoutes);
app.use('/api/mutes',            authenticateToken, mutesRoutes);
app.use('/api/scheduled-tasks', authenticateToken, scheduledTasksRoutes);
app.use('/api/guilds',          authenticateToken, guildsRoutes);
app.use('/api/arena',           authenticateToken, arenaRoutes);
app.use('/api/battleground',    authenticateToken, battlegroundRoutes);
app.use('/api/characters',      authenticateToken, charactersRoutes);
app.use('/api/namefilters',     authenticateToken, namefiltersRoutes);
app.use('/api/env-settings',   authenticateToken, envSettingsRoutes);
app.use('/api/dashboard',      authenticateToken, dashboardManageRoutes);
app.use('/api/alerts',         authenticateToken, alertsRoutes);
app.use('/api/pdump',          authenticateToken, pdumpRoutes);
app.use('/api/changelog',      authenticateToken, changelogRoutes);
app.use('/api/calendar',       authenticateToken, calendarRoutes);
app.use('/api/backups',        authenticateToken, backupsRoutes);
app.use('/api/healthcheck',    authenticateToken, healthcheckRoutes);
app.use('/api/batch',          authenticateToken, batchOperationsRoutes);
app.use('/api/character-transfer', authenticateToken, characterTransferRoutes);
app.use('/api/notifications',  authenticateToken, notificationsRoutes);
app.use('/api/analytics',      authenticateToken, analyticsRoutes);
app.use('/api/sessions',       authenticateToken, sessionsRoutes);

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  socket.on('subscribe', (serverName) => {
    if (wsConfig.getValidServers().includes(serverName)) {
      socket.join(`console-${serverName}`);
    }
  });
  socket.on('unsubscribe', (serverName) => {
    socket.leave(`console-${serverName}`);
  });
  socket.on('subscribe-overview', () => {
    socket.join('overview');
    emitOverview(); // push current state immediately to everyone in the room
  });
  socket.on('unsubscribe-overview', () => {
    socket.leave('overview');
  });
});

processManager.setIO(io); // no-op; kept for compatibility
serverBridge.init(io);   // connect to agent SSE stream and bridge events

// ── Discord alerts ────────────────────────────────────────────────────────────
const discord = require('./discord');

// Track last-known running state per server to detect crash transitions
const serverRunning = {};
for (const id of wsConfig.getValidServers()) {
  serverRunning[id] = null;
}

serverBridge.on('server-status', ({ server, running }) => {
  const wasRunning = serverRunning[server];
  serverRunning[server] = running;

  // Determine display label
  const wsEntry = wsConfig.getById(server);
  const label = wsEntry ? wsEntry.name : (server === 'authserver' ? 'Auth Server' : server);

  if (wasRunning === true && !running) {
    if (processManager.consumeIntentionalStop(server)) {
      discord.sendServerStop(server).catch(() => {});
      alertLogger.log('server_stop', 'info', `${label} stopped`, `${label} was stopped manually.`, { server });
    } else {
      discord.sendServerCrash(server).catch(() => {});
      alertLogger.log('server_crash', 'critical', `${label} went offline`, `${label} stopped or crashed unexpectedly.`, { server });
    }
  }
  if (wasRunning === false && running) {
    discord.sendServerOnline(server).catch(() => {});
    alertLogger.log('server_online', 'info', `${label} is online`, `${label} started successfully.`, { server });
  }
});

serverBridge.on('agent-disconnected', () => {
  discord.sendAgentDisconnect().catch(() => {});
  alertLogger.log('agent_disconnect', 'critical', 'Server agent disconnected', 'The server agent has disconnected. Game servers may be unmanaged.');
});

// Pre-load DBC lookup tables (gracefully no-ops if DBC_PATH is not set)
dbc.init();

// Start the scheduled task runner
scheduler.init();

// Poll player count every 30 s and store in rolling history
const { charPool, authPool, worldPool } = require('./db');
const os = require('os');
const thresholds = require('./thresholds');

async function emitOverview() {
  // Each query is wrapped individually so a single DB failure doesn't abort the whole push
  let playerCount = 0, ticketCount = 0, banCount = 0, motd = '', version = null, agentStatus = {};
  try { const [[r]] = await charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1'); playerCount = Number(r.count); } catch {}
  try { const [[r]] = await charPool.query('SELECT COUNT(*) AS count FROM gm_ticket WHERE type = 0');   ticketCount = Number(r.count); } catch {}
  try { const [[r]] = await authPool.query('SELECT COUNT(*) AS count FROM account_banned WHERE active = 1'); banCount = Number(r.count); } catch {}
  try { const [[r]] = await authPool.query('SELECT text FROM motd LIMIT 1'); motd = r?.text ?? ''; } catch {}
  try { const [[r]] = await worldPool.query('SELECT core_version, core_revision, db_version, cache_id FROM version'); version = r ?? null; } catch {}
  try { agentStatus = await processManager.getAllStatus(); } catch {}

  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const memPct   = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const t        = await thresholds.load();
  const windowMs = (t.graphMinutes ?? 60) * 60 * 1000;
  const cutoff   = Date.now() - windowMs;
  const latest   = resourceHistory.getHistory().slice(-1)[0];

  // Build servers object dynamically
  const servers = { authserver: agentStatus.authserver };
  for (const id of wsConfig.getIds()) {
    servers[id] = agentStatus[id] || { running: false, autoRestart: false, pid: null, startTime: null };
  }

  io.to('overview').emit('overview:update', {
    servers,
    worldservers: wsConfig.load().map((ws) => ({ id: ws.id, name: ws.name })),
    dashboard: { backendUptime: process.uptime(), agentConnected: serverBridge.isConnected(), agentUptime: agentStatus.uptime ?? null },
    players:   { current: playerCount },
    tickets:   { open:    ticketCount },
    bans:      { active:  banCount },
    system:    { totalMem, freeMem, memPct, cpuUsage: latest?.cpu ?? 0, cpuCount: os.cpus().length, platform: os.platform() },
    thresholds: t,
    motd,
    version,
    playerHistory:   playerHistory.getHistory(),
    resourceHistory: resourceHistory.getHistory().filter((p) => p.time >= cutoff),
    serverLatency:   latencyMonitor.getAllStats(),
  });
}

async function pollPlayerCount() {
  try {
    const [rows] = await charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1');
    playerHistory.record(Number(rows[0].count));
  } catch {}
}
pollPlayerCount();
setInterval(pollPlayerCount, 30000);

// Poll CPU and memory every 30 s and store in rolling history
function pollResources() {
  const snap1 = os.cpus().map((c) => ({ ...c.times }));
  setTimeout(async () => {
    const snap2 = os.cpus();
    let totalIdle = 0, totalTick = 0;
    snap2.forEach((cpu, i) => {
      const t1 = snap1[i], t2 = cpu.times;
      const idle  = t2.idle - t1.idle;
      const total = (t2.user - t1.user) + (t2.nice - t1.nice) +
                    (t2.sys  - t1.sys)  + (t2.irq  - t1.irq)  + idle;
      totalIdle += idle;
      totalTick += total;
    });
    const cpu    = totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0;
    const total  = os.totalmem();
    const memory = Math.round(((total - os.freemem()) / total) * 100);
    resourceHistory.record(cpu, memory);
    // Persist to historical analytics (every 5 min to avoid excessive writes)
    const ANALYTICS_INTERVAL_MS = 300000;
    if (!pollResources._lastAnalytics || Date.now() - pollResources._lastAnalytics >= ANALYTICS_INTERVAL_MS) {
      pollResources._lastAnalytics = Date.now();
      const latestPlayer = playerHistory.getHistory().slice(-1)[0];
      analyticsRoutes.recordSnapshot(latestPlayer ? latestPlayer.count : 0, cpu, memory);
    }
    // Threshold breach Discord alerts + DB logging
    const t = await thresholds.load();
    if (t.cpu && cpu >= t.cpu) {
      discord.sendThresholdBreach('cpu', cpu, t.cpu).catch(() => {});
      alertLogger.log('threshold', 'warning', 'CPU threshold breached', `CPU usage reached ${cpu}% (threshold: ${t.cpu}%).`, { resource: 'cpu', value: cpu, threshold: t.cpu });
    }
    if (t.memory && memory >= t.memory) {
      discord.sendThresholdBreach('memory', memory, t.memory).catch(() => {});
      alertLogger.log('threshold', 'warning', 'Memory threshold breached', `Memory usage reached ${memory}% (threshold: ${t.memory}%).`, { resource: 'memory', value: memory, threshold: t.memory });
    }

    // Latency threshold check — check all worldservers
    const allLatStats = latencyMonitor.getAllStats();
    for (const [serverId, latStats] of Object.entries(allLatStats)) {
      if (!latStats) continue;
      const wsEntry = wsConfig.getById(serverId);
      const label = wsEntry ? wsEntry.name : serverId;
      if (t.latencyCritical && latStats.mean >= t.latencyCritical) {
        discord.sendLatencyAlert('critical', latStats.mean, t.latencyCritical).catch(() => {});
        alertLogger.log('latency', 'critical', `${label} latency critical threshold breached`, `Mean latency is ${latStats.mean} ms (threshold: ${t.latencyCritical} ms).`, { server: serverId, mean: latStats.mean, p95: latStats.p95, p99: latStats.p99, max: latStats.max, threshold: t.latencyCritical });
      } else if (t.latencyWarn && latStats.mean >= t.latencyWarn) {
        discord.sendLatencyAlert('warning', latStats.mean, t.latencyWarn).catch(() => {});
        alertLogger.log('latency', 'warning', `${label} latency warning threshold breached`, `Mean latency is ${latStats.mean} ms (threshold: ${t.latencyWarn} ms).`, { server: serverId, mean: latStats.mean, p95: latStats.p95, p99: latStats.p99, max: latStats.max, threshold: t.latencyWarn });
      }
    }

    emitOverview();
  }, 200);
}
pollResources();
setInterval(pollResources, 30000);

// Poll worldserver TCP latency every 30 s
latencyMonitor.start(30000);

// Start audit log retention job (honours AUDIT_LOG_RETENTION_DAYS env var)
startRetentionJob();

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`AzerothCore Dashboard backend listening on port ${PORT}`);
  console.log(`  Frontend: ${getFrontendOrigins().join(', ')}`);
});
