/**
 * Worldserver configuration — reads worldserver definitions from
 * worldservers.json (multi-server) or falls back to .env variables
 * (single-server backward compatibility).
 *
 * Each worldserver entry has:
 *   id            — unique slug used in API routes and Socket.IO rooms
 *   name          — human-readable display name
 *   path          — absolute path to the executable
 *   dir           — working directory (defaults to exe directory)
 *   host          — hostname for TCP latency checks
 *   port          — game port for TCP latency checks
 *   characterDb   — name of the characters database
 *   worldDb       — name of the world database
 */

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../worldservers.json');

let _configs = null;

function load() {
  if (_configs) return _configs;

  // Try worldservers.json first
  try {
    const raw    = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      _configs = parsed.map((ws, i) => ({
        id:          ws.id   || (i === 0 ? 'worldserver' : `worldserver-${i + 1}`),
        name:        ws.name || `World Server ${i + 1}`,
        path:        ws.path || '',
        dir:         ws.dir  || '',
        host:        ws.host || '127.0.0.1',
        port:        parseInt(ws.port, 10) || 8085,
        characterDb: ws.characterDb || process.env.CHARACTERS_DB || 'acore_characters',
        worldDb:     ws.worldDb     || process.env.WORLD_DB      || 'acore_world',
      }));
      return _configs;
    }
  } catch {
    // File missing or malformed — fall through to .env fallback
  }

  // Fallback to .env (single worldserver — full backward compatibility)
  _configs = [{
    id:          'worldserver',
    name:        'World Server',
    path:        process.env.WORLDSERVER_PATH || '',
    dir:         process.env.WORLDSERVER_DIR  || '',
    host:        process.env.WORLDSERVER_HOST || '127.0.0.1',
    port:        parseInt(process.env.WORLDSERVER_PORT || '8085', 10),
    characterDb: process.env.CHARACTERS_DB    || 'acore_characters',
    worldDb:     process.env.WORLD_DB         || 'acore_world',
  }];

  return _configs;
}

/** Return the list of all worldserver IDs. */
function getIds() {
  return load().map((ws) => ws.id);
}

/** Return configuration for a specific worldserver by ID, or null. */
function getById(id) {
  return load().find((ws) => ws.id === id) || null;
}

/** Return true if `name` is a known worldserver ID. */
function isWorldserver(name) {
  return getIds().includes(name);
}

/** Return all valid server names (all worldserver IDs + 'authserver'). */
function getValidServers() {
  return [...getIds(), 'authserver'];
}

/** Reset cached config so next call to load() re-reads the file. */
function reload() {
  _configs = null;
  return load();
}

module.exports = { load, getIds, getById, isWorldserver, getValidServers, reload };
