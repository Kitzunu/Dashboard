const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { audit } = require('../audit');
const dashboardSettings = require('../dashboardSettings');
const wsConfig = require('../worldservers');
const log = require('../logger')('config');

const router = express.Router();

// Recursively walk a directory and collect all .conf files into map.
// Keys are forward-slash relative paths without the .conf extension
// (e.g. "worldserver", "modules/mod_example").
async function walkDir(dir, baseDir, map) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    log.warn(`Could not read directory (${dir}): ${err.message}`);
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    let stat;
    try { stat = await fs.stat(fullPath); } catch { continue; }
    if (stat.isDirectory()) {
      await walkDir(fullPath, baseDir, map);
    } else if (stat.isFile() && entry.endsWith('.conf')) {
      const rel  = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const name = rel.slice(0, -5); // strip .conf
      map[name]  = fullPath;
    }
  }
}

// If CONFIG_PATH is set, all .conf files in that directory (and subdirectories)
// are loaded. Otherwise falls back to deriving paths from exe locations and
// worldservers.json realm directories.
async function getConfigMap() {
  const map = {};

  const configDir = process.env.CONFIG_PATH;
  if (configDir) {
    await walkDir(configDir, configDir, map);
  }

  // No CONFIG_PATH — derive paths from exe locations
  if (!configDir) {
    const worldConf = process.env.WORLDSERVER_PATH
      ? path.join(path.dirname(process.env.WORLDSERVER_PATH), 'worldserver.conf')
      : null;

    const authConf = process.env.AUTHSERVER_PATH
      ? path.join(path.dirname(process.env.AUTHSERVER_PATH), 'authserver.conf')
      : null;

    if (worldConf) map['worldserver'] = worldConf;
    if (authConf)  map['authserver']  = authConf;
  }

  // Also scan each realm's directory from worldservers.json
  const realms = wsConfig.load();
  const scannedDirs = new Set(configDir ? [path.resolve(configDir)] : []);
  for (const realm of realms) {
    if (!realm.dir) continue;
    const realmDir = path.resolve(realm.dir);
    if (scannedDirs.has(realmDir)) continue;
    scannedDirs.add(realmDir);
    // Prefix realm config names with realm name to avoid collisions
    const prefix = realms.length > 1 ? `${realm.name}/` : '';
    const realmMap = {};
    await walkDir(realmDir, realmDir, realmMap);
    for (const [name, filePath] of Object.entries(realmMap)) {
      const key = `${prefix}${name}`;
      if (!map[key]) map[key] = filePath;
    }
  }

  return map;
}

async function resolvePath(name) {
  const map = await getConfigMap();
  return map[name] || null;
}

// GET /api/config — list known config files and whether they exist on disk
router.get('/', requireGMLevel(3), async (req, res) => {
  const map = await getConfigMap();
  const result = await Promise.all(
    Object.entries(map).map(async ([name, filePath]) => {
      let exists = false;
      try { await fs.access(filePath); exists = true; } catch {}
      return { name, filePath, exists };
    })
  );
  const order = ['worldserver', 'authserver'];
  result.sort((a, b) => {
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
  res.json(result);
});

// GET /api/config/<name> — read a config file (name may contain slashes for subdirs)
router.get(/^\/(.+)$/, requireGMLevel(3), async (req, res) => {
  const name     = req.params[0];
  const filePath = await resolvePath(name);
  if (!filePath) return res.status(404).json({ error: 'Unknown config file' });

  try {
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ name, filePath, content });
  } catch (err) {
    res.status(500).json({ error: `Could not read file: ${err.message}` });
  }
});

// PUT /api/config/<name> — save a config file (creates a .bak backup first)
router.put(/^\/(.+)$/, requireGMLevel(3), async (req, res) => {
  const name     = req.params[0];
  const filePath = await resolvePath(name);
  if (!filePath) return res.status(404).json({ error: 'Unknown config file' });

  const { content } = req.body;
  if (typeof content !== 'string')
    return res.status(400).json({ error: 'content must be a string' });

  try {
    // Back up the existing file before overwriting (if setting enabled)
    let oldContent = null;
    try {
      oldContent = await fs.readFile(filePath, 'utf8');
      const bakEnabled = await dashboardSettings.getBoolean('config.bak_enabled');
      if (bakEnabled) await fs.copyFile(filePath, filePath + '.bak');
    } catch {} // ignore if original doesn't exist yet

    await fs.writeFile(filePath, content, 'utf8');

    // Build a compact diff summary: list key=value lines that changed
    const changedKeys = [];
    if (oldContent !== null) {
      const keyRe = /^[A-Za-z][A-Za-z0-9_.]*$/;
      const parseKV = (line) => {
        const trimmed = line.trim();
        const eq = trimmed.indexOf('=');
        if (eq === -1) return null;
        const key = trimmed.slice(0, eq).trimEnd();
        if (!keyRe.test(key)) return null;
        return [key, trimmed.slice(eq + 1).trim()];
      };

      const oldMap = {};
      for (const line of oldContent.split('\n')) {
        const kv = parseKV(line);
        if (kv) oldMap[kv[0]] = kv[1];
      }
      for (const line of content.split('\n')) {
        const kv = parseKV(line);
        if (kv && oldMap[kv[0]] !== undefined && oldMap[kv[0]] !== kv[1]) {
          changedKeys.push(`${kv[0]}: "${oldMap[kv[0]]}" → "${kv[1]}"`);
        }
      }
    }
    const details = changedKeys.length
      ? `file=${name} changes: ${changedKeys.join('; ')}`
      : `file=${name}`;
    audit(req, 'config.save', details);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Could not save file: ${err.message}` });
  }
});

module.exports = router;
