const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');

const router = express.Router();

const CONDITION_TYPES = ['Level','PlayTime','Quest','Achievement','Reputation','Faction','Race','Class','AccountFlags'];
const FACTIONS        = ['Alliance', 'Horde'];

// ── Templates ─────────────────────────────────────────────────────────────────

// GET /api/mailserver  — list all templates with aggregate counts
router.get('/', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await charPool.query(
      `SELECT t.id, t.subject, t.moneyA, t.moneyH, t.active,
              COUNT(DISTINCT i.id)   AS itemCount,
              COUNT(DISTINCT c.id)   AS conditionCount,
              COUNT(DISTINCT r.guid) AS recipientCount
       FROM mail_server_template t
       LEFT JOIN mail_server_template_items      i ON i.templateID = t.id
       LEFT JOIN mail_server_template_conditions c ON c.templateID = t.id
       LEFT JOIN mail_server_character           r ON r.mailId     = t.id
       GROUP BY t.id
       ORDER BY t.id DESC`
    );
    res.json(rows.map((r) => ({
      ...r,
      active:         Boolean(r.active),
      itemCount:      Number(r.itemCount),
      conditionCount: Number(r.conditionCount),
      recipientCount: Number(r.recipientCount),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mailserver/:id  — full template with items and conditions
router.get('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[template]] = await charPool.query(
      'SELECT * FROM mail_server_template WHERE id = ?', [id]
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const [items]      = await charPool.query(
      'SELECT * FROM mail_server_template_items WHERE templateID = ? ORDER BY id', [id]
    );
    const [conditions] = await charPool.query(
      'SELECT * FROM mail_server_template_conditions WHERE templateID = ? ORDER BY id', [id]
    );

    res.json({ ...template, active: Boolean(template.active), items, conditions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mailserver  — create template
router.post('/', requireGMLevel(3), async (req, res) => {
  const { subject, body, moneyA, moneyH, active } = req.body;
  if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
  if (!body    || !body.trim())    return res.status(400).json({ error: 'Body is required' });

  try {
    const [result] = await charPool.query(
      'INSERT INTO mail_server_template (subject, body, moneyA, moneyH, active) VALUES (?, ?, ?, ?, ?)',
      [subject.trim(), body.trim(), Math.max(0, parseInt(moneyA) || 0), Math.max(0, parseInt(moneyH) || 0), active ? 1 : 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mailserver/:id  — update template
router.put('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { subject, body, moneyA, moneyH, active } = req.body;
  if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
  if (!body    || !body.trim())    return res.status(400).json({ error: 'Body is required' });

  try {
    await charPool.query(
      'UPDATE mail_server_template SET subject=?, body=?, moneyA=?, moneyH=?, active=? WHERE id=?',
      [subject.trim(), body.trim(), Math.max(0, parseInt(moneyA) || 0), Math.max(0, parseInt(moneyH) || 0), active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mailserver/:id  — delete template (cascades to items / conditions / characters)
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await charPool.query('DELETE FROM mail_server_template WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Items ─────────────────────────────────────────────────────────────────────

// POST /api/mailserver/:id/items  — add item to template
router.post('/:id/items', requireGMLevel(3), async (req, res) => {
  const templateID = parseInt(req.params.id, 10);
  const { faction, item, itemCount } = req.body;

  if (!FACTIONS.includes(faction))           return res.status(400).json({ error: 'Invalid faction' });
  if (!item || parseInt(item) <= 0)          return res.status(400).json({ error: 'Invalid item ID' });
  if (!itemCount || parseInt(itemCount) <= 0) return res.status(400).json({ error: 'Invalid item count' });

  try {
    // Confirm template exists
    const [[tpl]] = await charPool.query('SELECT id FROM mail_server_template WHERE id = ?', [templateID]);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });

    const [result] = await charPool.query(
      'INSERT INTO mail_server_template_items (templateID, faction, item, itemCount) VALUES (?, ?, ?, ?)',
      [templateID, faction, parseInt(item), Math.max(1, parseInt(itemCount) || 1)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mailserver/:id/items/:itemId  — remove item
router.delete('/:id/items/:itemId', requireGMLevel(3), async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  try {
    await charPool.query('DELETE FROM mail_server_template_items WHERE id = ?', [itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Conditions ────────────────────────────────────────────────────────────────

// POST /api/mailserver/:id/conditions  — add condition to template
router.post('/:id/conditions', requireGMLevel(3), async (req, res) => {
  const templateID = parseInt(req.params.id, 10);
  const { conditionType, conditionValue, conditionState } = req.body;

  if (!CONDITION_TYPES.includes(conditionType)) return res.status(400).json({ error: 'Invalid condition type' });

  try {
    const [[tpl]] = await charPool.query('SELECT id FROM mail_server_template WHERE id = ?', [templateID]);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });

    const [result] = await charPool.query(
      'INSERT INTO mail_server_template_conditions (templateID, conditionType, conditionValue, conditionState) VALUES (?, ?, ?, ?)',
      [templateID, conditionType, Math.max(0, parseInt(conditionValue) || 0), Math.max(0, parseInt(conditionState) || 0)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mailserver/:id/conditions/:condId  — remove condition
router.delete('/:id/conditions/:condId', requireGMLevel(3), async (req, res) => {
  const condId = parseInt(req.params.condId, 10);
  try {
    await charPool.query('DELETE FROM mail_server_template_conditions WHERE id = ?', [condId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recipients ────────────────────────────────────────────────────────────────

// GET /api/mailserver/:id/recipients  — characters that already received this template
router.get('/:id/recipients', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [rows] = await charPool.query(
      `SELECT r.guid, c.name AS charName, c.race, c.class, c.level
       FROM mail_server_character r
       LEFT JOIN characters c ON c.guid = r.guid
       WHERE r.mailId = ?
       ORDER BY c.name`,
      [id]
    );
    res.json({ recipients: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
