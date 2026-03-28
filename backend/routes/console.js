const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const processManager = require('../processManager');

const router = express.Router();

router.post('/command', requireGMLevel(2), (req, res) => {
  const { command } = req.body;
  if (!command || !command.trim()) {
    return res.status(400).json({ error: 'Command is required' });
  }
  res.json(processManager.sendCommand(command.trim()));
});

module.exports = router;
