const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

// POST /api/mail
// body: { type: 'text'|'items'|'money', player, subject, body, items?: [{id,count}], money?: number }
router.post('/', requireGMLevel(2), (req, res) => {
  const { type = 'text', player, subject, body, items, money } = req.body;

  if (!player?.trim())   return res.status(400).json({ error: 'Player name is required' });
  if (!subject?.trim())  return res.status(400).json({ error: 'Subject is required' });
  if (!body?.trim())     return res.status(400).json({ error: 'Message body is required' });

  const p = player.trim();
  // Escape double-quotes inside subject/body so the command doesn't break
  const s = subject.trim().replace(/"/g, "'");
  const b = body.trim().replace(/"/g, "'");

  let command;

  if (type === 'money') {
    const copper = parseInt(money, 10);
    if (!copper || copper < 1) return res.status(400).json({ error: 'Money must be at least 1 copper' });
    command = `send money ${p} "${s}" "${b}" ${copper}`;

  } else if (type === 'items') {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    for (const item of items) {
      if (!item.id || isNaN(parseInt(item.id, 10))) {
        return res.status(400).json({ error: `Invalid item ID: ${item.id}` });
      }
      if (!item.count || isNaN(parseInt(item.count, 10)) || parseInt(item.count, 10) < 1) {
        return res.status(400).json({ error: `Invalid count for item ${item.id}` });
      }
    }
    const itemStr = items.map((i) => `${parseInt(i.id, 10)}:${parseInt(i.count, 10)}`).join(' ');
    command = `send items ${p} "${s}" "${b}" ${itemStr}`;

  } else {
    command = `send mail ${p} "${s}" "${b}"`;
  }

  const result = processManager.sendCommand(command);
  if (!result.success) return res.status(503).json({ error: result.error });
  audit(req, 'mail.send', `to=${p} subject=${s} type=${type}`);
  res.json({ success: true });
});

module.exports = router;
