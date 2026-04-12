require('dotenv').config({
  path: require('path').join(__dirname, '../.env'),
  quiet: true
 });

const mysql2 = require('mysql2/promise');
const wsConfig = require('./worldservers');

const baseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'acore',
  password: process.env.DB_PASSWORD || 'acore',
  waitForConnections: true,
  connectionLimit: 10,
};

const authPool  = mysql2.createPool({ ...baseConfig, database: process.env.AUTH_DB       || 'acore_auth' });
const dashPool  = mysql2.createPool({ ...baseConfig, database: process.env.DASHBOARD_DB  || 'acore_dashboard' });

// ── Realm pool manager ─────────────────────────────────────────────────────────
// Lazily creates and caches per-realm charPool / worldPool based on worldservers.json

const _poolCache = new Map(); // key: "char:dbname" or "world:dbname" → pool

function _getOrCreatePool(database) {
  if (_poolCache.has(database)) return _poolCache.get(database);
  const pool = mysql2.createPool({ ...baseConfig, database });
  _poolCache.set(database, pool);
  return pool;
}

/**
 * Returns { charPool, worldPool } for a given realm ID.
 * Pools are cached by database name so realms sharing a DB share a pool.
 */
function getRealmPools(realmId) {
  const ws = wsConfig.getById(realmId);
  if (!ws) {
    // Fallback to first realm
    const first = wsConfig.load()[0];
    return {
      charPool:  _getOrCreatePool(first.characterDb),
      worldPool: _getOrCreatePool(first.worldDb),
    };
  }
  return {
    charPool:  _getOrCreatePool(ws.characterDb),
    worldPool: _getOrCreatePool(ws.worldDb),
  };
}

/** Returns the first realm's ID (default when no realm is specified). */
function getDefaultRealmId() {
  return wsConfig.load()[0].id;
}

/** Returns all realm IDs. */
function getAllRealmIds() {
  return wsConfig.getIds();
}

/** Returns all unique database names across all realms (for backups). */
function getAllRealmDbNames() {
  const names = new Set([process.env.AUTH_DB || 'acore_auth']);
  for (const ws of wsConfig.load()) {
    names.add(ws.characterDb);
    names.add(ws.worldDb);
  }
  return [...names];
}

// Default pools (first realm) for backward compatibility
const defaultPools = getRealmPools(getDefaultRealmId());
const charPool  = defaultPools.charPool;
const worldPool = defaultPools.worldPool;

module.exports = {
  authPool,
  dashPool,
  charPool,
  worldPool,
  getRealmPools,
  getDefaultRealmId,
  getAllRealmIds,
  getAllRealmDbNames,
};
