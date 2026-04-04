const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');

const BACKUP_PATH = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');

router.get('/', requireGMLevel(3), async (req, res) => {
  try {
    await fs.promises.mkdir(BACKUP_PATH, { recursive: true });
    const files = await fs.promises.readdir(BACKUP_PATH);
    const results = [];
    for (const name of files) {
      const filePath = path.join(BACKUP_PATH, name);
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) continue;
      const match = name.match(/^(.+?)_\d+/);
      results.push({
        name,
        size: stat.size,
        created: stat.birthtime,
        database: match ? match[1] : 'unknown',
      });
    }
    results.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isPathSafe(filePath, basePath) {
  const resolved = path.resolve(basePath, filePath);
  const rel = path.relative(path.resolve(basePath), resolved);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

router.get('/:filename', requireGMLevel(3), async (req, res) => {
  try {
    const { filename } = req.params;
    if (!isPathSafe(filename, BACKUP_PATH)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.resolve(BACKUP_PATH, filename);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:filename', requireGMLevel(3), async (req, res) => {
  try {
    const { filename } = req.params;
    if (!isPathSafe(filename, BACKUP_PATH)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.resolve(BACKUP_PATH, filename);
    await fs.promises.unlink(filePath);
    audit(req, 'backup.delete', `file=${filename}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
