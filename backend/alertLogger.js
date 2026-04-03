/**
 * Alert logger — persists system alerts (latency spikes, server crashes,
 * resource threshold breaches, agent disconnects) to the dashboard DB.
 *
 * The alerts table is created automatically on first use so existing
 * installations don't need a manual migration.
 */

const { dashPool } = require('./db');

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS \`alerts\` (
    \`id\`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    \`type\`        VARCHAR(64)     NOT NULL,
    \`severity\`    ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
    \`title\`       VARCHAR(255)    NOT NULL,
    \`description\` TEXT            DEFAULT NULL,
    \`metadata\`    JSON            DEFAULT NULL,
    \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_type\`       (\`type\`),
    KEY \`idx_severity\`   (\`severity\`),
    KEY \`idx_created_at\` (\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='System alert log'
`;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await dashPool.query(CREATE_TABLE);
  tableReady = true;
}

/**
 * Log an alert to the database.
 * @param {string} type       - e.g. 'latency', 'server_crash', 'threshold', 'agent_disconnect'
 * @param {'info'|'warning'|'critical'} severity
 * @param {string} title
 * @param {string|null} description
 * @param {object|null} metadata  - arbitrary JSON for context (values, thresholds, etc.)
 */
async function log(type, severity, title, description = null, metadata = null) {
  try {
    await ensureTable();
    await dashPool.query(
      'INSERT INTO `alerts` (`type`, `severity`, `title`, `description`, `metadata`) VALUES (?, ?, ?, ?, ?)',
      [type, severity, title, description, metadata !== null ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('[alertLogger] Failed to log alert:', err.message);
  }
}

module.exports = { log };
