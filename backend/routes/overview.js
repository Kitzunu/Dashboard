const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const os = require('os');
const { authPool, charPool, worldPool } = require('../db');
const processManager   = require('../processManager');
const serverBridge     = require('../serverBridge');
const playerHistory    = require('../playerHistory');
const resourceHistory  = require('../resourceHistory');
const thresholds       = require('../thresholds');
const latencyMonitor   = require('../latencyMonitor');

const router = express.Router();

function getCpuUsage() {
  return new Promise((resolve) => {
    const snap1 = os.cpus().map((c) => ({ ...c.times }));
    setTimeout(() => {
      const snap2 = os.cpus();
      let totalIdle = 0, totalTick = 0;
      snap2.forEach((cpu, i) => {
        const t1 = snap1[i];
        const t2 = cpu.times;
        const idle  = t2.idle  - t1.idle;
        const total = (t2.user - t1.user) + (t2.nice - t1.nice) +
                      (t2.sys  - t1.sys)  + (t2.irq  - t1.irq)  + idle;
        totalIdle += idle;
        totalTick += total;
      });
      resolve(totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0);
    }, 200);
  });
}

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [
      [playerRow], [ticketRow], [banRow], [motdRow], [versionRow],
      cpuUsage, agentStatus,
    ] = await Promise.all([
      charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1'),
      charPool.query('SELECT COUNT(*) AS count FROM gm_ticket WHERE type = 0'),
      authPool.query('SELECT COUNT(*) AS count FROM account_banned WHERE active = 1'),
      authPool.query('SELECT text FROM motd LIMIT 1'),
      worldPool.query('SELECT core_version, core_revision, db_version, cache_id FROM version'),
      getCpuUsage(),
      processManager.getAllStatus(),
    ]);

    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const memPct   = Math.round(((totalMem - freeMem) / totalMem) * 100);

    res.json({
      servers: {
        worldserver: agentStatus.worldserver,
        authserver:  agentStatus.authserver,
      },
      dashboard: {
        backendUptime:    process.uptime(),
        agentConnected:   serverBridge.isConnected(),
        agentUptime:      agentStatus.uptime ?? null,
      },
      players:       { current: Number(playerRow[0].count) },
      tickets:       { open:    Number(ticketRow[0].count) },
      bans:          { active:  Number(banRow[0].count) },
      system: {
        totalMem,
        freeMem,
        memPct,
        cpuUsage,
        cpuCount: os.cpus().length,
        platform: os.platform(),
      },
      thresholds:    thresholds.load(),
      motd:          motdRow[0]?.text ?? '',
      version:       versionRow[0] ?? null,
      playerHistory:   playerHistory.getHistory(),
      resourceHistory: (() => {
        const t = thresholds.load();
        const windowMs = (t.graphMinutes ?? 60) * 60 * 1000;
        const cutoff   = Date.now() - windowMs;
        return resourceHistory.getHistory().filter((p) => p.time >= cutoff);
      })(),
      serverLatency: latencyMonitor.getStats(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
