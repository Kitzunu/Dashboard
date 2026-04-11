/**
 * Audit logging helper.
 * Writes to acore_dashboard.audit_logs in a fire-and-forget fashion so
 * audit failures never break the main operation.
 */
const mysql2 = require('mysql2/promise');
const log = require('./logger')('audit');
require('dotenv').config({
  path: require('path').join(__dirname, '../.env'),
  quiet: true
 });

const baseConfig = {
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'acore',
  password: process.env.DB_PASSWORD || 'acore',
  waitForConnections: true,
  connectionLimit: 5,
};

const DB_NAME = process.env.DASHBOARD_DB || 'acore_dashboard';

// Separate pool — creates the DB if missing so it can always connect
let _pool = null;
let _poolPromise = null; // guards against concurrent initialisation

async function getPool() {
  if (_pool) return _pool;
  if (_poolPromise) return _poolPromise;

  _poolPromise = (async () => {
    // Bootstrap: connect without specifying a database to run CREATE DATABASE IF NOT EXISTS
    const bootstrap = await mysql2.createConnection({ ...baseConfig });
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrap.end();

    const pool = mysql2.createPool({ ...baseConfig, database: DB_NAME });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        \`username\`   VARCHAR(64)     NOT NULL DEFAULT '',
        \`ip\`         VARCHAR(45)     NOT NULL DEFAULT '',
        \`action\`     VARCHAR(128)    NOT NULL,
        \`details\`    TEXT            DEFAULT NULL,
        \`success\`    TINYINT(1)      NOT NULL DEFAULT 1,
        \`created_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_username\` (\`username\`),
        KEY \`idx_action\`   (\`action\`),
        KEY \`idx_created\`  (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`settings\` (
        \`key\`   VARCHAR(64)  NOT NULL,
        \`value\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    _pool = pool;
    return _pool;
  })();

  try {
    return await _poolPromise;
  } catch (err) {
    _poolPromise = null; // allow retry on next call
    throw err;
  }
}

// Extract the real client IP from a request object
function getIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// Fire-and-forget audit write — never throws
async function logAudit(username, ip, action, details = null, success = true) {
  try {
    const pool = await getPool();
    await pool.query(
      'INSERT INTO audit_logs (username, ip, action, details, success) VALUES (?, ?, ?, ?, ?)',
      [username || 'unknown', ip || 'unknown', action, details || null, success ? 1 : 0]
    );
  } catch (err) {
    // Audit failures must not break core operations, but log so they're diagnosable
    log.error('Failed to write audit log:', err.message);
  }
}

// Convenience: build a logAudit call from an express req
function audit(req, action, details = null, success = true) {
  const username = req.user?.username || 'unknown';
  const ip = getIP(req);
  return logAudit(username, ip, action, details, success);
}

// Export pool getter for the audit route
async function getAuditPool() { return getPool(); }

// Delete audit_logs rows older than AUDIT_LOG_RETENTION_DAYS days.
// Runs once immediately, then every 24 h. No-ops if the env var is 0 or unset.
async function startRetentionJob() {
  const days = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10);
  if (!days || days <= 0) return;

  async function purge() {
    try {
      const pool = await getPool();
      const [result] = await pool.query(
        'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [days]
      );
      if (result.affectedRows > 0) {
        log.info(`Purged ${result.affectedRows} log entries older than ${days} days`);
      }
    } catch (err) {
      log.error('Retention purge failed:', err.message);
    }
  }

  await purge();
  setInterval(purge, 24 * 60 * 60 * 1000);
}

module.exports = { logAudit, audit, getIP, getAuditPool, startRetentionJob };
