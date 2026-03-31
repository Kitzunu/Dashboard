const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { getAuditPool } = require('../audit');

const router = express.Router();
const PAGE_SIZE = 50;

// GET /api/audit-log?page=1&user=&actions=login,logout&success=&search=
router.get('/', requireGMLevel(3), async (req, res) => {
  const page    = Math.max(1, parseInt(req.query.page, 10) || 1);
  const user    = (req.query.user   || '').trim();
  const actions = (req.query.actions || '').split(',').map((s) => s.trim()).filter(Boolean);
  const success = req.query.success; // '1', '0', or omitted
  const search  = (req.query.search || '').trim();
  const offset  = (page - 1) * PAGE_SIZE;

  try {
    const pool = await getAuditPool();

    const conditions = [];
    const params = [];

    if (user) {
      conditions.push('username LIKE ?');
      params.push(`%${user}%`);
    }
    if (actions.length > 0) {
      conditions.push(`action IN (${actions.map(() => '?').join(',')})`);
      params.push(...actions);
    }
    if (success === '1' || success === '0') {
      conditions.push('success = ?');
      params.push(parseInt(success, 10));
    }
    if (search) {
      conditions.push('(LOWER(username) LIKE ? OR LOWER(action) LIKE ? OR LOWER(details) LIKE ? OR LOWER(ip) LIKE ?)');
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, username, ip, action, details, success, created_at
       FROM audit_logs ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    res.json({ rows, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
