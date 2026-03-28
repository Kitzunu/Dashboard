const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool } = require('../db');

const router = express.Router();

router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await authPool.query(
      `SELECT ab.id, a.username, ab.bandate, ab.unbandate, ab.bannedby, ab.banreason
       FROM account_banned ab
       JOIN account a ON ab.id = a.id
       WHERE ab.active = 1
       ORDER BY ab.bandate DESC
       LIMIT 200`
    );
    res.json(rows.map((r) => ({
      id: r.id,
      username: r.username,
      bandate: r.bandate,
      unbandate: r.unbandate,
      bannedby: r.bannedby,
      banreason: r.banreason,
      permanent: r.unbandate === 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid ban id' });
  try {
    await authPool.query('UPDATE account_banned SET active = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
