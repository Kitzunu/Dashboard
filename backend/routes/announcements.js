const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');

const router = express.Router();

const history = [];
const MAX_HISTORY = 50;

// GET /api/announcements/history
router.get('/history', requireGMLevel(1), (req, res) => {
  res.json(history);
});

// POST /api/announcements  { type: 'announce'|'notify', message: string }
router.post('/', requireGMLevel(2), (req, res) => {
  const { type, message } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ error: 'Message is required' });
  if (!['announce', 'notify'].includes(type))
    return res.status(400).json({ error: "type must be 'announce' or 'notify'" });

  const cmd = type === 'announce'
    ? `.server announce ${message.trim()}`
    : `.server notify ${message.trim()}`;

  const result = processManager.sendCommand(cmd);

  if (result.success !== false) {
    history.unshift({ type, message: message.trim(), by: req.user?.username || '?', time: Date.now() });
    if (history.length > MAX_HISTORY) history.pop();
  }

  res.json(result);
});

module.exports = router;
