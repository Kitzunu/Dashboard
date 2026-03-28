const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool, authPool } = require('../db');
const processManager = require('../processManager');

const router = express.Router();

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const authDb = process.env.AUTH_DB || 'acore_auth';
    const [rows] = await charPool.query(
      `SELECT c.guid, c.name, c.race, c.\`class\`, c.level, c.zone, c.account,
              a.username
       FROM characters c
       LEFT JOIN ${authDb}.account a ON c.account = a.id
       WHERE c.online = 1
       ORDER BY c.name`
    );
    res.json(rows);
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
  const { duration, reason } = req.body;
  if (!duration || !reason) {
    return res.status(400).json({ error: 'Duration and reason are required' });
  }
  res.json(processManager.sendCommand(`.ban character ${name} ${duration} ${reason}`));
});

module.exports = router;
