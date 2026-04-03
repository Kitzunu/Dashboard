const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

const VALID_TYPES = ['profanity', 'reserved'];
function table(type) {
  return type === 'profanity' ? 'profanity_name' : 'reserved_name';
}

// GET /api/namefilters — returns both lists
router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [profanity] = await charPool.query('SELECT name FROM profanity_name ORDER BY name');
    const [reserved]  = await charPool.query('SELECT name FROM reserved_name ORDER BY name');
    res.json({ profanity: profanity.map(r => r.name), reserved: reserved.map(r => r.name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/namefilters/:type — add a name
router.post('/:type', requireGMLevel(2), async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (name.length > 12) return res.status(400).json({ error: 'Name must be 12 characters or fewer' });
  try {
    await charPool.query(`INSERT INTO ${table(type)} (name) VALUES (?)`, [name]);
    audit(req, `namefilter.add_${type}`, `name=${name}`);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/namefilters/:type/:name — remove a name
router.delete('/:type/:name', requireGMLevel(2), async (req, res) => {
  const { type, name } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  try {
    const [result] = await charPool.query(`DELETE FROM ${table(type)} WHERE name = ?`, [name]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Name not found' });
    audit(req, `namefilter.remove_${type}`, `name=${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
