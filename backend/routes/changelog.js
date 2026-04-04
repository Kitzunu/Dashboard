const express = require('express');
const fs      = require('fs/promises');
const path    = require('path');
const { requireGMLevel } = require('../middleware/auth');

const router = express.Router();
const CHANGELOG_PATH = path.join(__dirname, '../../changelog.md');

// Parse changelog.md into an array of structured entry objects.
// Expected format per entry (entries are separated by <!-- entry-separator -->):
//
//   ## <shortHash> — <subject>
//
//   **Author**: <name> | **Date**: <date> | **Link**: <url>
//
//   <optional body>
//
function parseChangelog(content) {
  const sections = content.split('<!-- entry-separator -->').map((s) => s.trim()).filter(Boolean);

  const entries = [];
  for (const section of sections) {
    // Support em dash (—), en dash (–), or hyphen-minus (-) as separators
    const headerMatch = section.match(/^## ([a-f0-9]+) [—–-] (.+)/m);
    if (!headerMatch) continue;

    const hash    = headerMatch[1];
    const subject = headerMatch[2].trim();

    const metaMatch = section.match(
      /\*\*Author\*\*:\s*(.+?)\s*\|\s*\*\*Date\*\*:\s*(.+?)\s*\|\s*\*\*Link\*\*:\s*(https?:\/\/\S+)/
    );
    const author = metaMatch ? metaMatch[1].trim() : '';
    const date   = metaMatch ? metaMatch[2].trim() : '';
    const link   = metaMatch ? metaMatch[3].trim() : '';

    // Body: everything after the metadata line
    const metaLineEnd = metaMatch ? section.indexOf(metaMatch[0]) + metaMatch[0].length : -1;
    const body = metaLineEnd > -1 ? section.slice(metaLineEnd).trim() : '';

    entries.push({ hash, subject, author, date, link, body });
  }

  return entries;
}

// GET /api/changelog
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    let content;
    try {
      content = await fs.readFile(CHANGELOG_PATH, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') return res.json({ entries: [] });
      throw err;
    }
    const entries = parseChangelog(content);
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
