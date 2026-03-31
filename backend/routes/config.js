const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { audit } = require('../audit');

const router = express.Router();

// If CONFIG_PATH is set, all .conf files in that directory are loaded (including
// worldserver.conf and authserver.conf if present). Otherwise falls back to
// deriving worldserver/authserver paths from their exe locations.
async function getConfigMap() {
  const map = {};

  const configDir = process.env.CONFIG_PATH;
  if (configDir) {
    try {
      const entries = await fs.readdir(configDir);
      for (const entry of entries) {
        if (!entry.endsWith('.conf')) continue;
        const name = entry.slice(0, -5); // strip .conf
        map[name] = path.join(configDir, entry);
      }
    } catch (err) {
      console.warn(`[config] Could not read CONFIG_PATH (${configDir}): ${err.message}`);
    }
    return map;
  }

  // No CONFIG_PATH — derive paths from exe locations
  const worldConf = process.env.WORLDSERVER_PATH
    ? path.join(path.dirname(process.env.WORLDSERVER_PATH), 'worldserver.conf')
    : null;

  const authConf = process.env.AUTHSERVER_PATH
    ? path.join(path.dirname(process.env.AUTHSERVER_PATH), 'authserver.conf')
    : null;

  if (worldConf) map['worldserver'] = worldConf;
  if (authConf)  map['authserver']  = authConf;

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

// GET /api/config/:name — read a config file
router.get('/:name', requireGMLevel(3), async (req, res) => {
  const filePath = await resolvePath(req.params.name);
  if (!filePath) return res.status(404).json({ error: 'Unknown config file' });

  try {
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ name: req.params.name, filePath, content });
  } catch (err) {
    res.status(500).json({ error: `Could not read file: ${err.message}` });
  }
});

// PUT /api/config/:name — save a config file (creates a .bak backup first)
router.put('/:name', requireGMLevel(3), async (req, res) => {
  const filePath = await resolvePath(req.params.name);
  if (!filePath) return res.status(404).json({ error: 'Unknown config file' });

  const { content } = req.body;
  if (typeof content !== 'string')
    return res.status(400).json({ error: 'content must be a string' });

  try {
    // Back up the existing file before overwriting
    let oldContent = null;
    try {
      oldContent = await fs.readFile(filePath, 'utf8');
      await fs.copyFile(filePath, filePath + '.bak');
    } catch {} // ignore if original doesn't exist yet

    await fs.writeFile(filePath, content, 'utf8');

    // Build a compact diff summary: list key=value lines that changed
    const changedKeys = [];
    if (oldContent !== null) {
      const kvRe = /^([A-Za-z][A-Za-z0-9_.]*)\s*=\s*(.*)$/;
      const oldMap = {};
      for (const line of oldContent.split('\n')) {
        const m = line.trim().match(kvRe);
        if (m) oldMap[m[1]] = m[2].trim();
      }
      for (const line of content.split('\n')) {
        const m = line.trim().match(kvRe);
        if (m && oldMap[m[1]] !== undefined && oldMap[m[1]] !== m[2].trim()) {
          changedKeys.push(`${m[1]}: "${oldMap[m[1]]}" → "${m[2].trim()}"`);
        }
      }
    }
    const details = changedKeys.length
      ? `file=${req.params.name} changes: ${changedKeys.join('; ')}`
      : `file=${req.params.name}`;
    audit(req, 'config.save', details);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Could not save file: ${err.message}` });
  }
});

module.exports = router;
