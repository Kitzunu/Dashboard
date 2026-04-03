const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const thresholds = require('../thresholds');

const router = express.Router();

// GET /api/thresholds
router.get('/', requireGMLevel(1), (req, res) => {
  res.json(thresholds.load());
});

// PUT /api/thresholds  { cpu: 0-100, memory: 0-100, graphMinutes: 1-60, latencyWarn: ms, latencyCritical: ms }
router.put('/', requireGMLevel(3), (req, res) => {
  const { cpu, memory, graphMinutes, latencyWarn, latencyCritical } = req.body;

  const cpuVal           = parseInt(cpu, 10);
  const memoryVal        = parseInt(memory, 10);
  const graphMinutesVal  = parseInt(graphMinutes, 10);
  const latencyWarnVal   = parseInt(latencyWarn, 10);
  const latencyCriticalVal = parseInt(latencyCritical, 10);

  if (isNaN(cpuVal)             || cpuVal             < 1  || cpuVal             > 100)
    return res.status(400).json({ error: 'cpu must be 1–100' });
  if (isNaN(memoryVal)          || memoryVal           < 1  || memoryVal           > 100)
    return res.status(400).json({ error: 'memory must be 1–100' });
  if (isNaN(graphMinutesVal)    || graphMinutesVal     < 1  || graphMinutesVal     > 60)
    return res.status(400).json({ error: 'graphMinutes must be 1–60' });
  if (isNaN(latencyWarnVal)     || latencyWarnVal      < 1)
    return res.status(400).json({ error: 'latencyWarn must be >= 1 ms' });
  if (isNaN(latencyCriticalVal) || latencyCriticalVal  < 1)
    return res.status(400).json({ error: 'latencyCritical must be >= 1 ms' });
  if (latencyWarnVal >= latencyCriticalVal)
    return res.status(400).json({ error: 'latencyWarn must be less than latencyCritical' });

  const saved = thresholds.save({ cpu: cpuVal, memory: memoryVal, graphMinutes: graphMinutesVal, latencyWarn: latencyWarnVal, latencyCritical: latencyCriticalVal });
  res.json(saved);
});

module.exports = router;
