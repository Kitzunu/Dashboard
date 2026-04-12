const express = require('express');
const router = express.Router();
const os = require('os');
const { requireGMLevel } = require('../middleware/auth');
const { dashPool, authPool, getAllRealmIds, getRealmPools } = require('../db');
const wsConfig = require('../worldservers');
const processManager = require('../processManager');
const serverBridge = require('../serverBridge');

async function testPool(name, pool) {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    return { name, status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { name, status: 'error', latencyMs: 0, error: err.message };
  }
}

function getPoolConnections(name, pool) {
  try {
    const p = pool.pool;
    const free = p._freeConnections ? p._freeConnections.length : 0;
    const all = p._allConnections ? p._allConnections.length : 0;
    return { name, free, active: all - free, total: all };
  } catch {
    return { name, free: 0, active: 0, total: 0 };
  }
}

router.get('/', requireGMLevel(3), async (req, res) => {
  try {
    const [auth, char, world, dash] = await Promise.all([
      testPool('auth', authPool),
      testPool('characters', req.charPool),
      testPool('world', req.worldPool),
      testPool('dashboard', dashPool),
    ]);

    const connections = [
      getPoolConnections('auth', authPool),
      getPoolConnections('characters', req.charPool),
      getPoolConnections('world', req.worldPool),
      getPoolConnections('dashboard', dashPool),
    ];

    const system = {
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
      platform: os.platform(),
      cpuCount: os.cpus().length,
    };

    let agent = {};
    try {
      agent = await processManager.getAllStatus();
    } catch {
      agent = { error: 'Agent unreachable' };
    }

    res.json({
      database: [auth, char, world, dash],
      connections,
      system,
      agent,
      serverBridge: { connected: serverBridge.isConnected() },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/healthcheck/all — health for all realm pools
router.get('/all', requireGMLevel(3), async (req, res) => {
  try {
    const realmIds = getAllRealmIds();
    const realms = [];

    // Shared pools
    const [authResult, dashResult] = await Promise.all([
      testPool('auth', authPool),
      testPool('dashboard', dashPool),
    ]);
    const sharedPools = [authResult, dashResult];
    const sharedConnections = [
      getPoolConnections('auth', authPool),
      getPoolConnections('dashboard', dashPool),
    ];

    for (const id of realmIds) {
      const ws = wsConfig.getById(id);
      const pools = getRealmPools(id);
      const [charResult, worldResult] = await Promise.all([
        testPool(`characters (${ws?.characterDb || id})`, pools.charPool),
        testPool(`world (${ws?.worldDb || id})`, pools.worldPool),
      ]);
      realms.push({
        id,
        name: ws?.name || id,
        database: [charResult, worldResult],
        connections: [
          getPoolConnections(`characters (${ws?.characterDb || id})`, pools.charPool),
          getPoolConnections(`world (${ws?.worldDb || id})`, pools.worldPool),
        ],
      });
    }

    const system = {
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
      platform: os.platform(),
      cpuCount: os.cpus().length,
    };

    let agent = {};
    try {
      agent = await processManager.getAllStatus();
    } catch {
      agent = { error: 'Agent unreachable' };
    }

    res.json({
      sharedPools,
      sharedConnections,
      realms,
      system,
      agent,
      serverBridge: { connected: serverBridge.isConnected() },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
