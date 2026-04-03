const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

// POST /api/dashboard/restart/backend
router.post('/restart/backend', requireGMLevel(3), (req, res) => {
  audit(req, 'dashboard.restart_backend');
  res.json({ ok: true });
  setTimeout(() => process.exit(42), 500);
});

// POST /api/dashboard/restart/agent
// WARNING: this kills the server agent — game servers will be unmanaged until it comes back
router.post('/restart/agent', requireGMLevel(3), async (req, res) => {
  audit(req, 'dashboard.restart_agent');
  await processManager.restartAgent();
  res.json({ ok: true });
});

// POST /api/dashboard/restart/frontend
// Vite dev server doesn't support remote restart — instruct the user to do it manually.
// In production (built mode) the frontend is static files — no restart needed.
// We expose this endpoint so the UI can call it; the response carries the instruction.
router.post('/restart/frontend', requireGMLevel(3), (req, res) => {
  audit(req, 'dashboard.restart_frontend');
  res.json({ ok: true, manual: true, message: 'The frontend (Vite dev server) cannot be restarted remotely. Please restart it manually in the terminal.' });
});

module.exports = router;
