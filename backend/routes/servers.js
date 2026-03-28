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

router.post('/:name/stop', requireGMLevel(3), (req, res) => {
  const { name } = req.params;
  if (!VALID_SERVERS.includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json(processManager.stopServer(name));
});

module.exports = router;
