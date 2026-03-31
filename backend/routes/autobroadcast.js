const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/autobroadcast
router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await authPool.query('SELECT id, text, weight FROM autobroadcast ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/autobroadcast
router.post('/', requireGMLevel(3), async (req, res) => {
  const { text, weight = 1 } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });
  try {
    const [result] = await authPool.query(
      'INSERT INTO autobroadcast (text, weight) VALUES (?, ?)',
      [text.trim(), Math.max(1, parseInt(weight) || 1)]
    );
    audit(req, 'autobroadcast.create', `text=${text.trim()} weight=${Math.max(1, parseInt(weight) || 1)}`);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/autobroadcast/:id
router.put('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { text, weight = 1 } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });
  try {
    await authPool.query(
      'UPDATE autobroadcast SET text = ?, weight = ? WHERE id = ?',
      [text.trim(), Math.max(1, parseInt(weight) || 1), id]
    );
    audit(req, 'autobroadcast.update', `id=${id} text=${text.trim()} weight=${Math.max(1, parseInt(weight) || 1)}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/autobroadcast/:id
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await authPool.query('DELETE FROM autobroadcast WHERE id = ?', [id]);
    audit(req, 'autobroadcast.delete', `id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
