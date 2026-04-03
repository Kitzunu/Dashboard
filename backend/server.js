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
const charactersRoutes       = require('./routes/characters');
const namefiltersRoutes      = require('./routes/namefilters');
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

const app = express();
const httpServer = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '10mb' }));
app.use(ipAllowlist);

// Serve backend/public so assets like the icon can be referenced from Discord webhooks
app.use('/img', require('express').static(require('path').join(__dirname, 'public')));

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
app.use('/api/characters',      authenticateToken, charactersRoutes);
app.use('/api/namefilters',     authenticateToken, namefiltersRoutes);

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
    if (['worldserver', 'authserver'].includes(serverName)) {
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
const serverRunning = { worldserver: null, authserver: null };

serverBridge.on('server-status', ({ server, running }) => {
  const wasRunning = serverRunning[server];
  serverRunning[server] = running;
  if (wasRunning === true && !running) {
    discord.sendServerCrash(server).catch(() => {});
  }
  if (wasRunning === false && running) {
    discord.sendServerOnline(server).catch(() => {});
  }
});

serverBridge.on('agent-disconnected', () => {
  discord.sendAgentDisconnect().catch(() => {});
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
  const t        = thresholds.load();
  const windowMs = (t.graphMinutes ?? 60) * 60 * 1000;
  const cutoff   = Date.now() - windowMs;
  const latest   = resourceHistory.getHistory().slice(-1)[0];

  io.to('overview').emit('overview:update', {
    servers:   { worldserver: agentStatus.worldserver, authserver: agentStatus.authserver },
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
    serverLatency:   latencyMonitor.getStats(),
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
  setTimeout(() => {
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
    // Threshold breach Discord alerts
    const t = thresholds.load();
    if (t.cpu    && cpu    >= t.cpu)    discord.sendThresholdBreach('cpu',    cpu,    t.cpu).catch(() => {});
    if (t.memory && memory >= t.memory) discord.sendThresholdBreach('memory', memory, t.memory).catch(() => {});
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
  console.log(`  Frontend: ${frontendUrl}`);
});
