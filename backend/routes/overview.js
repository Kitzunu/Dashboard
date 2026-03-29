const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const os = require('os');
const { authPool, charPool, worldPool } = require('../db');
const processManager = require('../processManager');
const playerHistory = require('../playerHistory');

const router = express.Router();

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [[playerRow], [ticketRow], [banRow], [motdRow], [versionRow]] = await Promise.all([
      charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1'),
      charPool.query('SELECT COUNT(*) AS count FROM gm_ticket WHERE type = 0'),
      authPool.query('SELECT COUNT(*) AS count FROM account_banned WHERE active = 1'),
      authPool.query('SELECT text FROM motd LIMIT 1'),
      worldPool.query('SELECT core_version, core_revision, db_version, cache_id FROM version'),
    ]);

    res.json({
      servers: {
        worldserver: processManager.getStatus('worldserver'),
        authserver:  processManager.getStatus('authserver'),
      },
      players:       { current: Number(playerRow[0].count) },
      tickets:       { open:    Number(ticketRow[0].count) },
      bans:          { active:  Number(banRow[0].count) },
      system: {
        totalMem: os.totalmem(),
        freeMem:  os.freemem(),
        cpuCount: os.cpus().length,
        platform: os.platform(),
      },
      motd:          motdRow[0]?.text ?? '',
      version:       versionRow[0] ?? null,
      playerHistory: playerHistory.getHistory(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
