const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');

const router = express.Router();
const VALID_SERVERS = ['worldserver', 'authserver'];

router.get('/status', (req, res) => {
  res.json({
    worldserver: processManager.getStatus('worldserver'),
    authserver: processManager.getStatus('authserver'),
  });
});

router.get('/:name/logs', (req, res) => {
  const { name } = req.params;
  if (!VALID_SERVERS.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json({ logs: processManager.getLogs(name) });
});

router.post('/:name/start', requireGMLevel(3), (req, res) => {
  const { name } = req.params;
  if (!VALID_SERVERS.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json(processManager.startServer(name));
});

// mode: 'exit' (server exit) | 'shutdown' (server shutdown <delay>)
// authserver always uses kill regardless of mode
router.post('/:name/stop', requireGMLevel(3), (req, res) => {
  const { name } = req.params;
  if (!VALID_SERVERS.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  const { mode = 'exit', delay = 0 } = req.body;
  res.json(processManager.stopServer(name, mode, parseInt(delay, 10) || 0));
});

router.post('/:name/autorestart', requireGMLevel(3), (req, res) => {
  const { name } = req.params;
  if (!VALID_SERVERS.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  const { enabled } = req.body;
  res.json(processManager.setAutoRestart(name, enabled));
});

module.exports = router;
