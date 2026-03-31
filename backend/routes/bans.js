const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool, charPool } = require('../db');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/bans — returns { accounts, characters, ips }
router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [[accounts], [characters], [ips]] = await Promise.all([
      authPool.query(
        `SELECT ab.id, a.username, ab.bandate, ab.unbandate, ab.bannedby, ab.banreason
         FROM account_banned ab
         JOIN account a ON ab.id = a.id
         WHERE ab.active = 1
         ORDER BY ab.bandate DESC LIMIT 200`
      ),
      charPool.query(
        `SELECT cb.guid, c.name, cb.bandate, cb.unbandate, cb.bannedby, cb.banreason
         FROM character_banned cb
         JOIN characters c ON cb.guid = c.guid
         WHERE cb.active = 1
         ORDER BY cb.bandate DESC LIMIT 200`
      ),
      authPool.query(
        `SELECT ip, bandate, unbandate, bannedby, banreason
         FROM ip_banned
         ORDER BY bandate DESC LIMIT 200`
      ),
    ]);

    res.json({
      accounts:   accounts.map((r) => ({ ...r, permanent: r.unbandate === 0 })),
      characters: characters.map((r) => ({ ...r, permanent: r.unbandate === 0 })),
      ips:        ips.map((r) => ({ ...r, permanent: r.unbandate === 0 })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bans — ban by character name, account username, or IP via GM command
router.post('/', requireGMLevel(2), (req, res) => {
  const { type, target, duration, reason } = req.body;
  if (!type || !target || !duration || !reason) {
    return res.status(400).json({ error: 'type, target, duration, and reason are all required' });
  }
  if (!['character', 'account', 'ip'].includes(type)) {
    return res.status(400).json({ error: 'type must be character, account, or ip' });
  }
  const result = processManager.sendCommand(`.ban ${type} ${target} ${duration} ${reason}`);
  audit(req, `ban.${type}`, `target=${target} duration=${duration} reason=${reason}`);
  return res.json(result);
});

// DELETE /api/bans/accounts/:id
router.delete('/accounts/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid account id' });
  try {
    await authPool.query('UPDATE account_banned SET active = 0 WHERE id = ?', [id]);
    audit(req, 'unban.account', `account_id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bans/characters/:guid
router.delete('/characters/:guid', requireGMLevel(2), async (req, res) => {
  const guid = parseInt(req.params.guid, 10);
  if (!guid) return res.status(400).json({ error: 'Invalid character guid' });
  try {
    await charPool.query('UPDATE character_banned SET active = 0 WHERE guid = ?', [guid]);
    audit(req, 'unban.character', `guid=${guid}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bans/ips/:ip
router.delete('/ips/:ip', requireGMLevel(2), async (req, res) => {
  const ip = req.params.ip;
  if (!ip) return res.status(400).json({ error: 'Invalid IP' });
  try {
    await authPool.query('DELETE FROM ip_banned WHERE ip = ?', [ip]);
    audit(req, 'unban.ip', `ip=${ip}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
