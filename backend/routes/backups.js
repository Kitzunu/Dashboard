const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');
const { getAllRealmDbNames } = require('../db');

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

// POST /api/backups/create — create a backup now for specified databases
router.post('/create', requireGMLevel(3), async (req, res) => {
  const { databases } = req.body;
  const dbList = Array.isArray(databases) && databases.length
    ? databases
    : getAllRealmDbNames();

  const backupDir = BACKUP_PATH;
  await fs.promises.mkdir(backupDir, { recursive: true });

  const bin  = process.env.MYSQLDUMP_PATH || 'mysqldump';
  const host = process.env.DB_HOST     || '127.0.0.1';
  const port = process.env.DB_PORT     || '3306';
  const user = process.env.DB_USER     || 'acore';
  const pass = process.env.DB_PASSWORD || '';

  function pad(n) { return String(n).padStart(2, '0'); }
  const now = new Date();
  const ts  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const created = [];
  const errors  = [];

  for (const db of dbList) {
    const outName = `${db}_${ts}.sql`;
    const outPath = path.join(backupDir, outName);
    const args = [
      `--host=${host}`, `--port=${port}`, `--user=${user}`,
      '--single-transaction', '--routines', '--triggers',
      '--skip-tz-utc', '--extended-insert', db,
    ];

    try {
      await new Promise((resolve, reject) => {
        const proc = execFile(bin, args, {
          env: { ...process.env, MYSQL_PWD: pass },
          maxBuffer: 512 * 1024 * 1024,
        }, (err) => {
          if (err) reject(err);
        });

        const out = fs.createWriteStream(outPath);
        proc.stdout.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
      });
      created.push(outName);
    } catch (err) {
      errors.push({ database: db, error: err.message });
    }
  }

  audit(req, 'backup.create', `databases=${dbList.join(',')} files=${created.length} errors=${errors.length}`);
  res.json({ created, errors });
});

// POST /api/backups/restore — restore a backup by filename
router.post('/restore', requireGMLevel(3), async (req, res) => {
  const { filename } = req.body;
  if (!filename || !isPathSafe(filename, BACKUP_PATH)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(BACKUP_PATH, filename);
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  // Determine the target database from filename (e.g. acore_auth_2025-01-01_12-00.sql → acore_auth)
  const match = filename.match(/^(.+?)_\d{4}-/);
  if (!match) {
    return res.status(400).json({ error: 'Cannot determine database name from filename' });
  }
  const database = match[1];

  const bin  = process.env.MYSQL_PATH || 'mysql';
  const host = process.env.DB_HOST     || '127.0.0.1';
  const port = process.env.DB_PORT     || '3306';
  const user = process.env.DB_USER     || 'acore';
  const pass = process.env.DB_PASSWORD || '';

  const args = [
    `--host=${host}`, `--port=${port}`, `--user=${user}`, database,
  ];

  try {
    await new Promise((resolve, reject) => {
      const proc = execFile(bin, args, {
        env: { ...process.env, MYSQL_PWD: pass },
        maxBuffer: 512 * 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(proc.stdin);
      readStream.on('error', reject);
    });

    audit(req, 'backup.restore', `file=${filename} database=${database}`);
    res.json({ success: true, database, filename });
  } catch (err) {
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

module.exports = router;
