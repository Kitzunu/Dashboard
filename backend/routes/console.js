const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');
const { audit } = require('../audit');

const router = express.Router();

router.post('/command', requireGMLevel(2), async (req, res) => {
  const { command } = req.body;
  if (!command || !command.trim()) {
    return res.status(400).json({ error: 'Command is required' });
  }
  audit(req, 'console.command', command.trim());
  res.json(await processManager.sendCommand(command.trim()));
});

module.exports = router;
