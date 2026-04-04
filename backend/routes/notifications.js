const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await dashPool.query(
      'SELECT * FROM alerts ORDER BY id DESC LIMIT 50'
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', requireGMLevel(1), async (req, res) => {
  try {
    const username = req.user.username;
    const settingKey = `notifications_last_seen_${username}`;
    const [[setting]] = await dashPool.query(
      'SELECT `value` FROM settings WHERE `key` = ?',
      [settingKey]
    );
    let count;
    if (setting) {
      const lastSeen = parseInt(setting.value, 10);
      const [[result]] = await dashPool.query(
        'SELECT COUNT(*) as count FROM alerts WHERE id > ?',
        [lastSeen]
      );
      count = result.count;
    } else {
      const [[result]] = await dashPool.query(
        'SELECT COUNT(*) as count FROM alerts'
      );
      count = result.count;
    }
    res.json({ count: Number(count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mark-read', requireGMLevel(1), async (req, res) => {
  try {
    const { lastSeenId } = req.body;
    if (lastSeenId == null) {
      return res.status(400).json({ error: 'lastSeenId is required' });
    }
    const username = req.user.username;
    const settingKey = `notifications_last_seen_${username}`;
    await dashPool.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [settingKey, String(lastSeenId), String(lastSeenId)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
