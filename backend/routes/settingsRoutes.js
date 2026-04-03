const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const settings = require('../dashboardSettings');
const { audit } = require('../audit');
const discord  = require('../discord');

const router = express.Router();

// GET /api/settings — returns all settings as { key: value }
router.get('/', requireGMLevel(3), async (req, res) => {
  try {
    res.json(await settings.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — accepts { key: value, ... } bulk update
router.put('/', requireGMLevel(3), async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return res.status(400).json({ error: 'Body must be a key-value object' });

  try {
    await settings.setMany(body);
    const saved = await settings.getAll();
    audit(req, 'settings.save', Object.entries(body).map(([k, v]) => `${k}=${v}`).join('; '));
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/restart — gracefully restart the backend process via the runner
router.post('/restart', requireGMLevel(3), (req, res) => {
  audit(req, 'settings.restart_backend');
  res.json({ ok: true });
  setTimeout(() => process.exit(42), 500);
});

// POST /api/settings/discord/test — sends a test message to the configured webhook URL
router.post('/discord/test', requireGMLevel(3), async (req, res) => {
  const url = process.env.DISCORD_WEBHOOK_URL || '';
  if (!url) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL is not set in .env' });
  try {
    await discord.sendTest(url);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
