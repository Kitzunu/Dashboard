/**
 * Realm database middleware — attaches req.charPool, req.worldPool, and
 * req.realmId based on the ?realmId= query parameter.
 *
 * When no realmId is provided, defaults to the first configured realm
 * for full backward compatibility.
 */

const { getRealmPools, getDefaultRealmId, getAllRealmIds } = require('../db');

function realmDb(req, res, next) {
  const realmId = req.query.realmId || getDefaultRealmId();
  const validIds = getAllRealmIds();

  if (!validIds.includes(realmId)) {
    return res.status(400).json({ error: `Unknown realm: ${realmId}` });
  }

  const pools = getRealmPools(realmId);
  req.charPool  = pools.charPool;
  req.worldPool = pools.worldPool;
  req.realmId   = realmId;
  next();
}

module.exports = realmDb;
