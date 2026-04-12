const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');
const log = require('../logger')('analytics');

// Auto-create / migrate analytics_history table
const migrateReady = (async () => {
  try {
    await dashPool.query(`
      CREATE TABLE IF NOT EXISTS \`analytics_history\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`type\` VARCHAR(32) NOT NULL,
        \`value\` FLOAT NOT NULL DEFAULT 0,
        \`realm_id\` VARCHAR(64) DEFAULT NULL,
        \`recorded_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_type_recorded\` (\`type\`, \`recorded_at\`),
        KEY \`idx_realm_type_recorded\` (\`realm_id\`, \`type\`, \`recorded_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch { /* table already exists */ }

  // Add realm_id column if table existed before this migration
  try {
    await dashPool.query(`ALTER TABLE \`analytics_history\` ADD COLUMN \`realm_id\` VARCHAR(64) DEFAULT NULL AFTER \`value\``);
    log.info('Added realm_id column to analytics_history');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') log.debug('realm_id column migration:', err.message);
  }

  // Add realm index if missing
  try {
    await dashPool.query(`ALTER TABLE \`analytics_history\` ADD KEY \`idx_realm_type_recorded\` (\`realm_id\`, \`type\`, \`recorded_at\`)`);
  } catch { /* index already exists */ }
})();

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    await migrateReady;
    const { type, from, to, resolution, realmId } = req.query;
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

    // Build realm filter: if realmId specified, filter by it; otherwise show total (realm_id IS NULL)
    const realmFilter = realmId ? 'AND realm_id = ?' : 'AND realm_id IS NULL';
    const params = realmId ? [type, fromStr, toStr, realmId] : [type, fromStr, toStr];

    let query;

    if (resolution === 'hourly') {
      query = `SELECT AVG(value) as value,
               DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ? ${realmFilter}
               GROUP BY DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00')
               ORDER BY recorded_at ASC`;
    } else if (resolution === 'daily') {
      query = `SELECT AVG(value) as value,
               DATE_FORMAT(recorded_at, '%Y-%m-%d') as recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ? ${realmFilter}
               GROUP BY DATE_FORMAT(recorded_at, '%Y-%m-%d')
               ORDER BY recorded_at ASC`;
    } else {
      query = `SELECT value, recorded_at
               FROM analytics_history
               WHERE type = ? AND recorded_at BETWEEN ? AND ? ${realmFilter}
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
    await migrateReady;
    const peakQuery = `SELECT MAX(value) as peak FROM analytics_history
                       WHERE type = 'player_count' AND recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`;

    const avgQuery = `SELECT AVG(value) as average FROM analytics_history
                      WHERE type = ? AND recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)`;

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

/**
 * Record analytics snapshot.
 * @param {number} playerCount - total player count
 * @param {number} cpu - cpu usage %
 * @param {number} memory - memory usage %
 * @param {Object} [playersByRealm] - optional { realmId: count } breakdown
 */
async function recordSnapshot(playerCount, cpu, memory, playersByRealm) {
  try {
    await migrateReady;
    // Record totals (realm_id = NULL for aggregate)
    await dashPool.query(
      'INSERT INTO analytics_history (type, value, realm_id, recorded_at) VALUES (?, ?, NULL, UTC_TIMESTAMP()), (?, ?, NULL, UTC_TIMESTAMP()), (?, ?, NULL, UTC_TIMESTAMP())',
      ['player_count', playerCount, 'cpu', cpu, 'memory', memory]
    );
    // Record per-realm player counts
    if (playersByRealm && Object.keys(playersByRealm).length > 1) {
      const values = [];
      const params = [];
      for (const [realmId, count] of Object.entries(playersByRealm)) {
        values.push('(?, ?, ?, UTC_TIMESTAMP())');
        params.push('player_count', count, realmId);
      }
      await dashPool.query(
        `INSERT INTO analytics_history (type, value, realm_id, recorded_at) VALUES ${values.join(', ')}`,
        params
      );
    }
  } catch (err) {
    log.error('Failed to record snapshot:', err.message);
  }
}

module.exports = router;
module.exports.recordSnapshot = recordSnapshot;
