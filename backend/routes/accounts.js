const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool, charPool } = require('../db');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/accounts?q=searchterm&page=1  — search by username, email, or IP (50 per page)
const PAGE_SIZE = 50;
router.get('/', requireGMLevel(2), async (req, res) => {
  const q    = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const like = `%${q}%`;
  const offset = (page - 1) * PAGE_SIZE;
  try {
    const [[{ total }]] = await authPool.query(
      `SELECT COUNT(DISTINCT a.id) AS total
       FROM account a
       WHERE a.username LIKE ? OR a.email LIKE ? OR a.last_ip LIKE ?`,
      [like, like, like]
    );
    const [rows] = await authPool.query(
      `SELECT a.id, a.username, a.email, a.joindate, a.last_ip,
              a.last_login, a.online, a.locked, a.expansion,
              COALESCE(MAX(aa.gmlevel), 0) AS gmlevel
       FROM account a
       LEFT JOIN account_access aa ON a.id = aa.id
       WHERE a.username LIKE ? OR a.email LIKE ? OR a.last_ip LIKE ?
       GROUP BY a.id
       ORDER BY a.username
       LIMIT ? OFFSET ?`,
      [like, like, like, PAGE_SIZE, offset]
    );
    res.json({ rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/:id  — single account + characters
router.get('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[account]] = await authPool.query(
      `SELECT a.id, a.username, a.email, a.joindate, a.last_ip,
              a.last_login, a.online, a.locked, a.expansion, a.Flags,
              COALESCE(MAX(aa.gmlevel), 0) AS gmlevel
       FROM account a
       LEFT JOIN account_access aa ON a.id = aa.id
       WHERE a.id = ?
       GROUP BY a.id`,
      [id]
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const [characters] = await charPool.query(
      `SELECT guid, name, race, \`class\`, level, zone, online, totaltime
       FROM characters WHERE account = ? ORDER BY level DESC`,
      [id]
    );

    res.json({ ...account, characters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts  — create via GM command
router.post('/', requireGMLevel(3), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });
  const result = processManager.sendCommand(`account create ${username} ${password}`);
  audit(req, 'account.create', `username=${username}`);
  return res.json(result);
});

// PATCH /api/accounts/:id/flags  { flags: number }
router.patch('/:id/flags', requireGMLevel(3), async (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const flags = parseInt(req.body.flags, 10);
  if (isNaN(flags) || flags < 0)
    return res.status(400).json({ error: 'flags must be a non-negative integer' });
  try {
    await authPool.query('UPDATE account SET Flags = ? WHERE id = ?', [flags, id]);
    audit(req, 'account.set_flags', `account_id=${id} flags=${flags}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id/gmlevel  { gmlevel: 0-6 }
router.patch('/:id/gmlevel', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const level = parseInt(req.body.gmlevel, 10);
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
    audit(req, 'account.set_gmlevel', `account_id=${id} gmlevel=${level}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id/expansion  { expansion: 0-6 }
router.patch('/:id/expansion', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const expansion = parseInt(req.body.expansion, 10);
  if (isNaN(expansion) || expansion < 0 || expansion > 6)
    return res.status(400).json({ error: 'expansion must be 0–6' });
  try {
    const [[account]] = await authPool.query('SELECT username FROM account WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const result = processManager.sendCommand(`account set addon ${account.username} ${expansion}`);
    if (!result.success) return res.status(503).json({ error: result.error });
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
    audit(req, locked ? 'account.lock' : 'account.unlock', `account_id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id/email  { email: string }
router.patch('/:id/email', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { email } = req.body;
  if (typeof email !== 'string' || !email.trim())
    return res.status(400).json({ error: 'Email is required' });
  try {
    await authPool.query('UPDATE account SET email = ?, reg_mail = ? WHERE id = ?', [email.trim(), email.trim(), id]);
    audit(req, 'account.set_email', `account_id=${id}`);
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
    audit(req, 'account.set_password', `account_id=${id} username=${account.username}`);
    res.json(processManager.sendCommand(
      `account set password ${account.username} ${password} ${password}`
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id  — delete account via GM command
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[account]] = await authPool.query('SELECT username FROM account WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const result = processManager.sendCommand(`account delete ${account.username}`);
    if (!result.success) return res.status(503).json({ error: result.error });
    audit(req, 'account.delete', `account_id=${id} username=${account.username}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/mute  { name, minutes, reason }
router.post('/mute', requireGMLevel(3), (req, res) => {
  const { name, minutes, reason } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Character name is required' });
  const mins = parseInt(minutes, 10);
  if (!mins || mins < 1) return res.status(400).json({ error: 'Duration must be at least 1 minute' });
  if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required' });
  const result = processManager.sendCommand(`mute ${name.trim()} ${mins} ${reason.trim()}`);
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'account.mute', `name=${name.trim()} minutes=${mins} reason=${reason.trim()}`);
  res.json({ success: true });
});

// POST /api/accounts/unmute  { name }
router.post('/unmute', requireGMLevel(3), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Character name is required' });
  const result = processManager.sendCommand(`unmute ${name.trim()}`);
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'account.unmute', `name=${name.trim()}`);
  res.json({ success: true });
});

module.exports = router;
