const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');

// Auto-create analytics_history table
dashPool.query(`
  CREATE TABLE IF NOT EXISTS \`analytics_history\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`type\` VARCHAR(32) NOT NULL,
    \`value\` FLOAT NOT NULL DEFAULT 0,
    \`recorded_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_type_recorded\` (\`type\`, \`recorded_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`).catch(() => {});

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const { type, from, to, resolution } = req.query;
    if (!type || !from || !to) {
      return res.status(400).json({ error: 'type, from, and to are required' });
    }

    // Convert ISO date strings to MySQL-friendly format
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for from/to' });
    }
    const fromStr = fromDate.toISOString().slice(0, 19).replace('T', ' ');
    const toStr = toDate.toISOString().slice(0, 19).replace('T', ' ');

    let query;
    const params = [type, fromStr, toStr];

    if (resolution === 'hourly') {
      query = `SELECT AVG(value) as value,
               DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ?
               GROUP BY DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00')
               ORDER BY recorded_at ASC`;
    } else if (resolution === 'daily') {
      query = `SELECT AVG(value) as value,
               DATE_FORMAT(recorded_at, '%Y-%m-%d') as recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ?
               GROUP BY DATE_FORMAT(recorded_at, '%Y-%m-%d')
               ORDER BY recorded_at ASC`;
    } else {
      query = `SELECT value, recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ?
               ORDER BY recorded_at ASC
               LIMIT 5000`;
    }

    const [rows] = await dashPool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', requireGMLevel(1), async (req, res) => {
  try {
    const peakQuery = `SELECT MAX(value) as peak FROM analytics_history
                       WHERE type = 'player_count' AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`;

    const avgQuery = `SELECT AVG(value) as average FROM analytics_history
                      WHERE type = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;

    const [[peak24h], [peak7d], [peak30d], [avgCpu], [avgMemory]] = await Promise.all([
      dashPool.query(peakQuery, [1]),
      dashPool.query(peakQuery, [7]),
      dashPool.query(peakQuery, [30]),
      dashPool.query(avgQuery, ['cpu']),
      dashPool.query(avgQuery, ['memory']),
    ]);

    res.json({
      peakPlayers: {
        last24h: peak24h[0].peak || 0,
        last7d: peak7d[0].peak || 0,
        last30d: peak30d[0].peak || 0,
      },
      averages: {
        cpu: Math.round(avgCpu[0].average || 0),
        memory: Math.round(avgMemory[0].average || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recordSnapshot(playerCount, cpu, memory) {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await dashPool.query(
      'INSERT INTO analytics_history (type, value, recorded_at) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      ['player_count', playerCount, now, 'cpu', cpu, now, 'memory', memory, now]
    );
  } catch (err) {
    console.error('[analytics] Failed to record snapshot:', err.message);
  }
}

module.exports = router;
module.exports.recordSnapshot = recordSnapshot;
