/**
 * Persists alert thresholds to a local JSON file so they survive restarts.
 * Stored at backend/thresholds.json (next to this file).
 */
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'thresholds.json');

const DEFAULTS = { cpu: 80, memory: 85 };

function load() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(data) {
  const merged = { ...DEFAULTS, ...data };
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

module.exports = { load, save };
