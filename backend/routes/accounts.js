const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool, charPool } = require('../db');
const processManager = require('../processManager');

const router = express.Router();

// GET /api/accounts?q=searchterm  — search by username, email, or IP (max 50)
router.get('/', requireGMLevel(2), async (req, res) => {
  const q = (req.query.q || '').trim();
  const like = `%${q}%`;
  try {
    const [rows] = await authPool.query(
      `SELECT a.id, a.username, a.email, a.joindate, a.last_ip,
              a.last_login, a.online, a.locked,
              COALESCE(MAX(aa.gmlevel), 0) AS gmlevel
       FROM account a
       LEFT JOIN account_access aa ON a.id = aa.id
       WHERE a.username LIKE ? OR a.email LIKE ? OR a.last_ip LIKE ?
       GROUP BY a.id
       ORDER BY a.username
       LIMIT 50`,
      [like, like, like]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/:id  — single account + characters
router.get('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[accounts]] = await authPool.query(
      `SELECT a.id, a.username, a.email, a.joindate, a.last_ip,
              a.last_login, a.online, a.locked,
              COALESCE(MAX(aa.gmlevel), 0) AS gmlevel
       FROM account a
       LEFT JOIN account_access aa ON a.id = aa.id
       WHERE a.id = ?
       GROUP BY a.id`,
      [id]
    );
    if (!accounts) return res.status(404).json({ error: 'Account not found' });

    const [characters] = await charPool.query(
      `SELECT guid, name, race, \`class\`, level, zone, online, totaltime
       FROM characters WHERE account = ? ORDER BY level DESC`,
      [id]
    );

    res.json({ ...accounts, characters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts  — create via GM command
router.post('/', requireGMLevel(3), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });
  res.json(processManager.sendCommand(`.account create ${username} ${password}`));
});

// PATCH /api/accounts/:id/gmlevel  { gmlevel: 0-6 }
router.patch('/:id/gmlevel', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const level = parseInt(req.body.gmlevel);
  if (isNaN(level) || level < 0 || level > 6)
    return res.status(400).json({ error: 'gmlevel must be 0–6' });
  try {
    if (level === 0) {
      await authPool.query('DELETE FROM account_access WHERE id = ?', [id]);
    } else {
      await authPool.query(
        `INSERT INTO account_access (id, gmlevel, RealmID) VALUES (?, ?, -1)
         ON DUPLICATE KEY UPDATE gmlevel = ?`,
        [id, level, level]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id/lock  { locked: true|false }
router.patch('/:id/lock', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const locked = req.body.locked ? 1 : 0;
  try {
    await authPool.query('UPDATE account SET locked = ? WHERE id = ?', [locked, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/:id/password  { password: string }
router.post('/:id/password', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const [[account]] = await authPool.query('SELECT username FROM account WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(processManager.sendCommand(
      `.account set password ${account.username} ${password} ${password}`
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
