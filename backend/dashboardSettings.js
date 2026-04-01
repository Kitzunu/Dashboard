/**
 * Dashboard-wide settings stored in acore_dashboard.settings.
 * Uses the same pool as the audit log.
 */
const { getAuditPool } = require('./audit');

const DEFAULTS = {
  'config.bak_enabled': 'true',
};

async function getAll() {
  const pool = await getAuditPool();
  const [rows] = await pool.query('SELECT `key`, `value` FROM `settings`');
  const result = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

async function get(key) {
  const all = await getAll();
  return all[key] ?? DEFAULTS[key] ?? null;
}

async function getBoolean(key) {
  const val = await get(key);
  return val === 'true';
}

async function set(key, value) {
  const pool = await getAuditPool();
  await pool.query(
    'INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, String(value)]
  );
}

async function setMany(obj) {
  const pool = await getAuditPool();
  for (const [key, value] of Object.entries(obj)) {
    await pool.query(
      'INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, String(value)]
    );
  }
}

module.exports = { getAll, get, getBoolean, set, setMany, DEFAULTS };
