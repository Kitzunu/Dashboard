/**
 * /api/env-settings — read and write whitelisted .env keys.
 *
 * DB connection strings, JWT_SECRET, and PORT are intentionally excluded:
 *   - DB credentials/names require reconnecting pools — not safe at runtime.
 *   - JWT_SECRET must never be exposed in a UI.
 *   - PORT change would sever the connection before the response arrives.
 *
 * All operations require GM level 3 (Administrator).
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');

const router   = express.Router();
const ENV_PATH = path.join(__dirname, '../../.env');

// Keys that may be read and written via this API, grouped for the UI.
const WHITELIST = new Set([
  'WORLDSERVER_PATH',
  'AUTHSERVER_PATH',
  'WORLDSERVER_DIR',
  'AUTHSERVER_DIR',
  'WORLDSERVER_HOST',
  'WORLDSERVER_PORT',
  'DBC_PATH',
  'CONFIG_PATH',
  'BACKUP_PATH',
  'MYSQLDUMP_PATH',
  'FRONTEND_URL',
  'ALLOWED_IPS',
  'IDLE_TIMEOUT_MINUTES',
  'AUDIT_LOG_RETENTION_DAYS',
  'DISCORD_WEBHOOK_URL',
]);

// Parse the .env file, returning a map of key → { value, lineIndex, commented }.
function parseEnvFile(text) {
  const map = {};
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  lines.forEach((line, i) => {
    // Match active assignment: KEY=value
    let m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      map[m[1]] = { value: m[2], lineIndex: i, commented: false };
      return;
    }
    // Match commented-out assignment: # KEY=value
    m = line.match(/^#\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      // Only record if not already seen as an active key
      if (!map[m[1]]) {
        map[m[1]] = { value: m[2], lineIndex: i, commented: true };
      }
    }
  });
  return { lines, map };
}

// Write an updated value for a key back into the lines array.
// - If the key has an active line, replace it.
// - If it has a commented line, uncomment it and set the value.
// - Otherwise append at end.
function setEnvKey(lines, map, key, value) {
  const entry = map[key];
  if (entry) {
    lines[entry.lineIndex] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }
}

// GET /api/env-settings — return current values for whitelisted keys, read from the .env file
router.get('/', requireGMLevel(3), (req, res) => {
  try {
    const text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const { map } = parseEnvFile(text);

    const result = {};
    for (const key of WHITELIST) {
      // Always read from the file — it's the ground truth for the editor.
      // Active assignments take priority over commented-out ones (already handled by parseEnvFile).
      result[key] = map[key] ? map[key].value : '';
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/env-settings — update whitelisted keys in the .env file
router.put('/', requireGMLevel(3), (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates))
    return res.status(400).json({ error: 'Body must be a key-value object' });

  // Reject any non-whitelisted key
  const rejected = Object.keys(updates).filter((k) => !WHITELIST.has(k));
  if (rejected.length > 0)
    return res.status(400).json({ error: `Key(s) not allowed: ${rejected.join(', ')}` });

  try {
    const text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const { lines, map } = parseEnvFile(text);

    const changed = [];
    for (const [key, value] of Object.entries(updates)) {
      const oldVal = process.env[key] ?? map[key]?.value ?? '';
      if (String(value) === String(oldVal)) continue; // skip no-ops
      setEnvKey(lines, map, key, value);
      process.env[key] = value; // update running process for immediate effect where possible
      changed.push(`${key}: "${oldVal}" → "${value}"`);
    }

    if (changed.length === 0) return res.json({ ok: true, changed: [] });

    fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
    audit(req, 'env.save', changed.join('; '));
    res.json({ ok: true, changed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
