const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { audit } = require('../audit');
const log = require('../logger')('tickets');

const router = express.Router();

// type = 0 → open, type = 1 → closed, type = 2 → character deleted
const OPEN_WHERE = 'WHERE t.type = 0';

const TICKET_SELECT = `
  SELECT t.*,
         c.name  AS characterName,
         gm.name AS assignedToName
  FROM gm_ticket t
  LEFT JOIN characters c  ON t.playerGuid = c.guid
  LEFT JOIN characters gm ON t.assignedTo  = gm.guid AND t.assignedTo > 0
`;

// GET /api/tickets/count — open ticket count for sidebar badge
router.get('/count', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await req.charPool.query(
      `SELECT COUNT(*) AS count FROM gm_ticket WHERE type = 0`
    );
    res.json({ count: Number(rows[0].count) });
  } catch {
    res.json({ count: 0 });
  }
});

// GET /api/tickets — open tickets only
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await req.charPool.query(
      `${TICKET_SELECT} ${OPEN_WHERE} ORDER BY t.createTime DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    log.error('Query error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/all — all tickets including closed
router.get('/all', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await req.charPool.query(
      `${TICKET_SELECT} ORDER BY t.createTime DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    log.error('Query error (all):', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/close
router.post('/:id/close', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  audit(req, 'ticket.close', `ticket_id=${id}`);
  res.json(processManager.sendCommand(`.ticket close ${id}`));
});

// POST /api/tickets/:id/respond
router.post('/:id/respond', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  if (!response || !response.trim())
    return res.status(400).json({ error: 'Response text is required' });
  audit(req, 'ticket.respond', `ticket_id=${id} response=${response.trim()}`);
  res.json(processManager.sendCommand(`.ticket response ${id} ${response.trim()}`));
});

// POST /api/tickets/:id/comment
router.post('/:id/comment', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  if (!comment || !comment.trim())
    return res.status(400).json({ error: 'Comment text is required' });
  audit(req, 'ticket.comment', `ticket_id=${id} comment=${comment.trim()}`);
  res.json(processManager.sendCommand(`.ticket comment ${id} ${comment.trim()}`));
});

// POST /api/tickets/:id/assign  { gm: 'GMName' }
router.post('/:id/assign', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  const { gm } = req.body;
  if (!gm || !gm.trim()) return res.status(400).json({ error: 'GM name is required' });
  audit(req, 'ticket.assign', `ticket_id=${id} gm=${gm.trim()}`);
  res.json(processManager.sendCommand(`.ticket assign ${id} ${gm.trim()}`));
});

// POST /api/tickets/:id/unassign
router.post('/:id/unassign', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  audit(req, 'ticket.unassign', `ticket_id=${id}`);
  res.json(processManager.sendCommand(`.ticket unassign ${id}`));
});

// POST /api/tickets/:id/escalate
router.post('/:id/escalate', requireGMLevel(1), (req, res) => {
  const { id } = req.params;
  audit(req, 'ticket.escalate', `ticket_id=${id}`);
  res.json(processManager.sendCommand(`.ticket escalate ${id}`));
});

// POST /api/tickets/:id/deescalate — no GM command; update DB directly
router.post('/:id/deescalate', requireGMLevel(1), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid ticket ID' });
  try {
    await req.charPool.query('UPDATE gm_ticket SET escalated = 0 WHERE id = ?', [id]);
    audit(req, 'ticket.deescalate', `ticket_id=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
