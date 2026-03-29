const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const thresholds = require('../thresholds');

const router = express.Router();

// GET /api/thresholds
router.get('/', requireGMLevel(1), (req, res) => {
  res.json(thresholds.load());
});

// PUT /api/thresholds  { cpu: 0-100, memory: 0-100 }
router.put('/', requireGMLevel(3), (req, res) => {
  const { cpu, memory } = req.body;

  const cpuVal    = parseInt(cpu, 10);
  const memoryVal = parseInt(memory, 10);

  if (isNaN(cpuVal)    || cpuVal    < 1 || cpuVal    > 100)
    return res.status(400).json({ error: 'cpu must be 1–100' });
  if (isNaN(memoryVal) || memoryVal < 1 || memoryVal > 100)
    return res.status(400).json({ error: 'memory must be 1–100' });

  const saved = thresholds.save({ cpu: cpuVal, memory: memoryVal });
  res.json(saved);
});

module.exports = router;
