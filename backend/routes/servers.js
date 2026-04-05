const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const wsConfig = require('../worldservers');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/servers/list — return configured worldservers with metadata
router.get('/list', async (req, res) => {
  res.json(wsConfig.load().map((ws) => ({ id: ws.id, name: ws.name })));
});

router.get('/status', async (req, res) => {
  try {
    const status = await processManager.getAllStatus();
    const result = { authserver: status.authserver };
    for (const id of wsConfig.getIds()) {
      result[id] = status[id] || { running: false, autoRestart: false, pid: null, startTime: null };
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:name/logs', async (req, res) => {
  const { name } = req.params;
  if (!wsConfig.getValidServers().includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json({ logs: await processManager.getLogs(name) });
});

router.post('/:name/start', requireGMLevel(3), async (req, res) => {
  const { name } = req.params;
  if (!wsConfig.getValidServers().includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  audit(req, 'server.start', `server=${name}`);
  res.json(await processManager.startServer(name));
});

// mode: 'exit' (server exit) | 'shutdown' (server shutdown <delay>)
// authserver always uses kill regardless of mode
router.post('/:name/stop', requireGMLevel(3), async (req, res) => {
  const { name } = req.params;
  if (!wsConfig.getValidServers().includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  const { mode = 'exit', delay = 0 } = req.body;
  audit(req, 'server.stop', `server=${name} mode=${mode} delay=${delay}`);
  processManager.markIntentionalStop(name);
  res.json(await processManager.stopServer(name, mode, parseInt(delay, 10) || 0));
});

router.post('/:name/autorestart', requireGMLevel(3), async (req, res) => {
  const { name } = req.params;
  if (!wsConfig.getValidServers().includes(name)) return res.status(400).json({ error: 'Invalid server name' });
  res.json(await processManager.setAutoRestart(name, req.body.enabled));
});

module.exports = router;
