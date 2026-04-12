/**
 * Dashboard-wide settings stored in acore_dashboard.settings.
 * Uses the same pool as the audit log.
 */
const { getAuditPool } = require('./audit');

const DEFAULTS = {
  'config.bak_enabled':                 'true',
  'threshold.cpu':                      '80',
  'threshold.memory':                   '85',
  'threshold.graphMinutes':             '60',
  'threshold.latencyWarn':              '100',
  'threshold.latencyCritical':          '500',
  'discord.enabled':                    'true',
  'discord.webhook_username':           'AzerothCore Dashboard',
  'discord.webhook_avatar_url':         'https://raw.githubusercontent.com/Kitzunu/Dashboard/master/frontend/img/icon.png',
  'discord.alert_server_crash':         'true',
  'discord.message_server_crash':       '**{server}** has gone offline.',
  'discord.alert_server_stop':          'true',
  'discord.message_server_stop':        '**{server}** was stopped manually.',
  'discord.alert_server_online':        'true',
  'discord.message_server_online':      '**{server}** is online.',
  'discord.alert_threshold':            'true',
  'discord.message_threshold':          '**{resource}** usage is at **{pct}%** (threshold: {threshold}%).',
  'discord.alert_cooldown':             '5',
  'discord.alert_agent_disconnect':     'true',
  'discord.message_agent_disconnect':   'The server agent has disconnected. Game servers may be unmanaged.',
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
