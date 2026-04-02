const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { authPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/servertools/motd
router.get('/motd', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await authPool.query('SELECT text FROM motd LIMIT 1');
    res.json({ motd: rows[0]?.text ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/servertools/motd
router.put('/motd', requireGMLevel(3), async (req, res) => {
  const { motd } = req.body;
  if (typeof motd !== 'string' || !motd.trim()) {
    return res.status(400).json({ error: 'motd is required' });
  }
  const result = await processManager.sendCommand(`server set motd ${motd.trim()}`);
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'motd.set', motd.trim());
  res.json({ success: true });
});

// POST /api/servertools/restart  — delay in seconds, min 1
router.post('/restart', requireGMLevel(3), async (req, res) => {
  const delay  = Math.max(1, parseInt(req.body.delay, 10) || 60);
  const result = await processManager.sendCommand(`server restart ${delay}`);
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'server.restart', `delay=${delay}s`);
  res.json({ success: true, delay });
});

// POST /api/servertools/restart/cancel
router.post('/restart/cancel', requireGMLevel(3), async (req, res) => {
  const result = await processManager.sendCommand('server restart cancel');
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'server.restart_cancel');
  res.json({ success: true });
});

module.exports = router;
