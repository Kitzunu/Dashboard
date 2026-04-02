const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool, charPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/mutes — active mutes (mutetime > now)
router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await authPool.query(
      `SELECT a.id, a.username, a.mutetime, a.mutereason, a.muteby
       FROM account a
       WHERE a.mutetime > UNIX_TIMESTAMP()
       ORDER BY a.mutetime ASC`
    );
    res.json({ mutes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mutes/:id — unmute by account id (direct DB, no worldserver required)
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid account id' });
  try {
    await authPool.query(
      `UPDATE account SET mutetime = 0, mutereason = '', muteby = '' WHERE id = ?`,
      [id]
    );
    audit(req, 'account.unmute', `account_id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
