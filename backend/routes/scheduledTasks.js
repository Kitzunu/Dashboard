const express   = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');
const { audit }  = require('../audit');
const scheduler  = require('../scheduler');

const router = express.Router();

// GET /api/scheduled-tasks
router.get('/', requireGMLevel(3), async (req, res) => {
  try {
    const [rows] = await dashPool.query(
      'SELECT * FROM scheduled_tasks ORDER BY created_at ASC'
    );
    res.json({ tasks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scheduled-tasks
router.post('/', requireGMLevel(3), async (req, res) => {
  const { name, type, hour, minute, days, enabled, config } = req.body;
  if (!name?.trim())              return res.status(400).json({ error: 'name is required' });
  if (!['restart','backup'].includes(type)) return res.status(400).json({ error: 'type must be restart or backup' });
  if (hour < 0 || hour > 23)     return res.status(400).json({ error: 'hour must be 0–23' });
  if (minute < 0 || minute > 59) return res.status(400).json({ error: 'minute must be 0–59' });

  try {
    const [result] = await dashPool.query(
      `INSERT INTO scheduled_tasks (name, type, hour, minute, days, enabled, config)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), type,
        parseInt(hour, 10), parseInt(minute, 10),
        Array.isArray(days) ? days.join(',') : String(days || '0,1,2,3,4,5,6'),
        enabled ? 1 : 0,
        config ? JSON.stringify(config) : null,
      ]
    );
    audit(req, 'scheduled_task.create', `id=${result.insertId} name=${name.trim()} type=${type}`);
    const [[task]] = await dashPool.query('SELECT * FROM scheduled_tasks WHERE id = ?', [result.insertId]);
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scheduled-tasks/:id
router.put('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, type, hour, minute, days, enabled, config } = req.body;
  if (!name?.trim())              return res.status(400).json({ error: 'name is required' });
  if (!['restart','backup'].includes(type)) return res.status(400).json({ error: 'type must be restart or backup' });
  if (hour < 0 || hour > 23)     return res.status(400).json({ error: 'hour must be 0–23' });
  if (minute < 0 || minute > 59) return res.status(400).json({ error: 'minute must be 0–59' });

  try {
    await dashPool.query(
      `UPDATE scheduled_tasks SET name=?, type=?, hour=?, minute=?, days=?, enabled=?, config=?
       WHERE id=?`,
      [
        name.trim(), type,
        parseInt(hour, 10), parseInt(minute, 10),
        Array.isArray(days) ? days.join(',') : String(days || '0,1,2,3,4,5,6'),
        enabled ? 1 : 0,
        config ? JSON.stringify(config) : null,
        id,
      ]
    );
    audit(req, 'scheduled_task.update', `id=${id} name=${name.trim()}`);
    const [[task]] = await dashPool.query('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scheduled-tasks/:id
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[task]] = await dashPool.query('SELECT name FROM scheduled_tasks WHERE id = ?', [id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await dashPool.query('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    audit(req, 'scheduled_task.delete', `id=${id} name=${task.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scheduled-tasks/:id/run — run immediately
router.post('/:id/run', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const status = await scheduler.runNow(id);
    audit(req, 'scheduled_task.run_now', `id=${id}`);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
