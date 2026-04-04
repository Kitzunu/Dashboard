const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { authPool } = require('../db');
const processManager = require('../processManager');
const { audit } = require('../audit');

router.post('/ban', requireGMLevel(3), async (req, res) => {
  const { targets, duration, reason } = req.body;
  if (!Array.isArray(targets) || !targets.length) {
    return res.status(400).json({ error: 'targets array is required' });
  }
  if (!duration || !reason) {
    return res.status(400).json({ error: 'duration and reason are required' });
  }
  const results = [];
  for (const { type, target } of targets) {
    try {
      if (!['account', 'character', 'ip'].includes(type)) {
        results.push({ target, success: false, error: 'Invalid type' });
        continue;
      }
      await processManager.sendCommand(`.ban ${type} ${target} ${duration} ${reason}`);
      results.push({ target, success: true });
    } catch (err) {
      results.push({ target, success: false, error: err.message });
    }
  }
  audit(req, 'batch.ban', `count=${targets.length} duration=${duration} reason=${reason}`);
  res.json({ results });
});

router.post('/kick', requireGMLevel(3), async (req, res) => {
  const { names, reason } = req.body;
  if (!Array.isArray(names) || !names.length) {
    return res.status(400).json({ error: 'names array is required' });
  }
  const results = [];
  for (const name of names) {
    try {
      await processManager.sendCommand(`.kick ${name} ${reason || ''}`);
      results.push({ target: name, success: true });
    } catch (err) {
      results.push({ target: name, success: false, error: err.message });
    }
  }
  audit(req, 'batch.kick', `count=${names.length} reason=${reason || ''}`);
  res.json({ results });
});

router.post('/mail', requireGMLevel(3), async (req, res) => {
  const { recipients, subject, body, type, items, money } = req.body;
  if (!Array.isArray(recipients) || !recipients.length) {
    return res.status(400).json({ error: 'recipients array is required' });
  }
  if (!subject) {
    return res.status(400).json({ error: 'subject is required' });
  }
  const results = [];
  for (const recipient of recipients) {
    try {
      let cmd;
      if (type === 'money') {
        cmd = `.send money ${recipient} "${subject}" "${body || ''}" ${money}`;
      } else if (type === 'items') {
        cmd = `.send items ${recipient} "${subject}" "${body || ''}" ${items}`;
      } else {
        cmd = `.send mail ${recipient} "${subject}" "${body || ''}"`;
      }
      await processManager.sendCommand(cmd);
      results.push({ target: recipient, success: true });
    } catch (err) {
      results.push({ target: recipient, success: false, error: err.message });
    }
  }
  audit(req, 'batch.mail', `count=${recipients.length} type=${type || 'text'} subject=${subject}`);
  res.json({ results });
});

router.post('/gmlevel', requireGMLevel(3), async (req, res) => {
  const { accountIds, gmlevel } = req.body;
  if (!Array.isArray(accountIds) || !accountIds.length) {
    return res.status(400).json({ error: 'accountIds array is required' });
  }
  const level = parseInt(gmlevel, 10);
  if (isNaN(level) || level < 0 || level > 6) {
    return res.status(400).json({ error: 'gmlevel must be 0-6' });
  }
  const results = [];
  for (const id of accountIds) {
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
      results.push({ target: id, success: true });
    } catch (err) {
      results.push({ target: id, success: false, error: err.message });
    }
  }
  audit(req, 'batch.gmlevel', `count=${accountIds.length} gmlevel=${level}`);
  res.json({ results });
});

module.exports = router;
