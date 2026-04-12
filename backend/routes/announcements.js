const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

const history = [];
const MAX_HISTORY = 50;

// GET /api/announcements/history
router.get('/history', requireGMLevel(1), (req, res) => {
  res.json(history);
});

// POST /api/announcements  { type: 'announce'|'notify', message: string }
router.post('/', requireGMLevel(2), (req, res) => {
  const { type, message, server } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ error: 'Message is required' });
  if (!['announce', 'notify'].includes(type))
    return res.status(400).json({ error: "type must be 'announce' or 'notify'" });

  const cmd = type === 'announce'
    ? `.announce ${message.trim()}`
    : `.notify ${message.trim()}`;

  const result = processManager.sendCommand(cmd, server || undefined);

  if (result.success !== false) {
    history.unshift({ type, message: message.trim(), by: req.user?.username || '?', time: Date.now(), server: server || null });
    if (history.length > MAX_HISTORY) history.pop();
    audit(req, 'announcement.send', `type=${type} server=${server || 'default'} message=${message.trim()}`);
  }

  res.json(result);
});

module.exports = router;
