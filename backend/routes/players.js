const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool, authPool } = require('../db');
const processManager = require('../processManager');
const dbc = require('../dbc');

const router = express.Router();

router.get('/count', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1');
    res.json({ count: Number(rows[0].count) });
  } catch {
    res.json({ count: 0 });
  }
});

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const authDb = process.env.AUTH_DB || 'acore_auth';
    const [rows] = await charPool.query(
      `SELECT c.guid, c.name, c.race, c.\`class\`, c.level, c.zone, c.account,
              a.username, a.last_ip
       FROM characters c
       LEFT JOIN ${authDb}.account a ON c.account = a.id
       WHERE c.online = 1
       ORDER BY c.name`
    );
    const players = rows.map((r) => ({
      ...r,
      zoneName: dbc.getAreaName(r.zone) || null,
    }));
    res.json(players);
  } catch (err) {
    console.error('Players query error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

router.post('/:name/kick', requireGMLevel(2), (req, res) => {
  const { name } = req.params;
  const { reason } = req.body;
  const cmd = reason ? `.kick ${name} ${reason}` : `.kick ${name}`;
  res.json(processManager.sendCommand(cmd));
});

router.post('/:name/ban', requireGMLevel(2), (req, res) => {
  const { name } = req.params;
  const { type = 'character', target, duration, reason } = req.body;
  if (!duration || !reason) {
    return res.status(400).json({ error: 'Duration and reason are required' });
  }
  if (!['character', 'account', 'ip'].includes(type)) {
    return res.status(400).json({ error: 'type must be character, account, or ip' });
  }
  // target overrides name param (for account/IP bans from the players page)
  const banTarget = target || name;
  res.json(processManager.sendCommand(`.ban ${type} ${banTarget} ${duration} ${reason}`));
});

module.exports = router;
