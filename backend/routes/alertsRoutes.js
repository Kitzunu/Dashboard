const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');

const router   = express.Router();
const PAGE_SIZE = 50;

// GET /api/alerts?page=1&severity=warning&type=latency
router.get('/', requireGMLevel(1), async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
  const severity = (req.query.severity || '').trim();
  const type     = (req.query.type     || '').trim();
  const offset   = (page - 1) * PAGE_SIZE;

  const conditions = [];
  const params     = [];

  if (severity) { conditions.push('severity = ?'); params.push(severity); }
  if (type)     { conditions.push('type = ?');     params.push(type); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [[{ total }]] = await dashPool.query(
      `SELECT COUNT(*) AS total FROM alerts ${where}`,
      params
    );
    const [rows] = await dashPool.query(
      `SELECT * FROM alerts ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );
    res.json({ rows, total: Number(total), pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alerts  — batch delete by ?ids=1&ids=2, or clear matching ?severity=&type=&olderThan=N
router.delete('/', requireGMLevel(3), async (req, res) => {
  const rawIds = req.query.ids;

  if (rawIds !== undefined) {
    const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
      .map((v) => parseInt(v, 10))
      .filter((v) => v > 0);
    if (!ids.length) return res.status(400).json({ error: 'No valid IDs provided' });
    if (ids.length > 500) return res.status(400).json({ error: 'Too many IDs (max 500)' });
    const placeholders = ids.map(() => '?').join(',');
    try {
      await dashPool.query(`DELETE FROM alerts WHERE id IN (${placeholders})`, ids);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const olderThan = parseInt(req.query.olderThan, 10) || 0;
  const severity  = (req.query.severity || '').trim();
  const type      = (req.query.type     || '').trim();

  const conditions = [];
  const params     = [];

  if (olderThan > 0) { conditions.push('created_at < DATE_SUB(NOW(), INTERVAL ? DAY)'); params.push(olderThan); }
  if (severity)      { conditions.push('severity = ?'); params.push(severity); }
  if (type)          { conditions.push('type = ?');     params.push(type); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    await dashPool.query(`DELETE FROM alerts ${where}`, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  try {
    await dashPool.query('DELETE FROM alerts WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
