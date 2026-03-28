const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Use explicit config path env vars; fall back to deriving from exe path if not set
function getConfigMap() {
  const map = {};

  const worldConf = process.env.WORLDSERVER_CONF
    || (process.env.WORLDSERVER_PATH
        ? path.join(path.dirname(process.env.WORLDSERVER_PATH), 'worldserver.conf')
        : null);

  const authConf = process.env.AUTHSERVER_CONF
    || (process.env.AUTHSERVER_PATH
        ? path.join(path.dirname(process.env.AUTHSERVER_PATH), 'authserver.conf')
        : null);

  if (worldConf) map['worldserver'] = worldConf;
  if (authConf)  map['authserver']  = authConf;

  return map;
}

function resolvePath(name) {
  const map = getConfigMap();
  return map[name] || null;
}

// GET /api/config — list known config files and whether they exist on disk
router.get('/', requireGMLevel(3), async (req, res) => {
  const map = getConfigMap();
  const result = await Promise.all(
    Object.entries(map).map(async ([name, filePath]) => {
      let exists = false;
      try { await fs.access(filePath); exists = true; } catch {}
      return { name, filePath, exists };
    })
  );
  res.json(result);
});

// GET /api/config/:name — read a config file
router.get('/:name', requireGMLevel(3), async (req, res) => {
  const filePath = resolvePath(req.params.name);
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
  const filePath = resolvePath(req.params.name);
  if (!filePath) return res.status(404).json({ error: 'Unknown config file' });

  const { content } = req.body;
  if (typeof content !== 'string')
    return res.status(400).json({ error: 'content must be a string' });

  try {
    // Back up the existing file before overwriting
    try {
      await fs.copyFile(filePath, filePath + '.bak');
    } catch {} // ignore if original doesn't exist yet

    await fs.writeFile(filePath, content, 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Could not save file: ${err.message}` });
  }
});

module.exports = router;
