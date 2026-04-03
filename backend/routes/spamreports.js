const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

const PAGE_SIZE = 25;

// SpamType: 0 = mail, 1 = chat, 2 = calendar (PR #25329)
const SPAM_TYPES = { 0: 'Mail', 1: 'Chat', 2: 'Calendar' };

// GET /api/spamreports?page=1&type=all&search=term
router.get('/', requireGMLevel(1), async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
  const type   = req.query.type;   // '0', '1', '2' or omitted/all
  const search = (req.query.search || '').trim();
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const conditions = [];
    const params = [];

    if (type !== undefined && type !== 'all' && type !== '') {
      conditions.push('s.SpamType = ?');
      params.push(parseInt(type, 10));
    }

    if (search) {
      const words = search.split(/\s+/).filter(Boolean);
      const wordClauses = words.map(() =>
        '(LOWER(s.Description) LIKE ? OR LOWER(c.name) LIKE ?)'
      );
      conditions.push(`(${wordClauses.join(' OR ')})`);
      for (const word of words) {
        const like = `%${word.toLowerCase()}%`;
        params.push(like, like);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await charPool.query(
      `SELECT COUNT(*) AS total
       FROM spam_reports s
       LEFT JOIN characters c ON c.guid = s.SpammerGuid
       ${where}`,
      params
    );

    const [rows] = await charPool.query(
      `SELECT s.ID, s.SpamType, s.SpammerGuid, s.MailIdOrMessageType,
              s.ChannelId, s.SecondsSinceMessage, s.Description, s.Time,
              c.name AS spammerName
       FROM spam_reports s
       LEFT JOIN characters c ON c.guid = s.SpammerGuid
       ${where}
       ORDER BY s.ID DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const reports = rows.map((r) => ({
      id:                  r.ID,
      spamType:            r.SpamType,
      spamTypeLabel:       SPAM_TYPES[r.SpamType] ?? `Type ${r.SpamType}`,
      spammerGuid:         r.SpammerGuid,
      spammerName:         r.spammerName || `GUID ${r.SpammerGuid}`,
      mailIdOrMessageType: r.MailIdOrMessageType,
      channelId:           r.ChannelId,
      secondsSinceMessage: r.SecondsSinceMessage,
      description:         r.Description,
      time:                r.Time,
    }));

    res.json({ reports, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/spamreports/:id — remove a spam report (GM 2+)
router.delete('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await charPool.query('DELETE FROM spam_reports WHERE ID = ?', [id]);
    audit(req, 'spamreport.delete', `id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/spamreports — clear all reports (GM 3+)
router.delete('/', requireGMLevel(3), async (req, res) => {
  try {
    await charPool.query('DELETE FROM spam_reports');
    audit(req, 'spamreport.clear_all');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
