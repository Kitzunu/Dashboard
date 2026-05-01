const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// Map AzerothCore security levels (account_access.gmlevel) to the default RBAC
// role permission IDs seeded by the core migration. The core treats gmlevel
// values >=3 as Administrator.
const SECURITY_ROLE = { 0: 195, 1: 194, 2: 193, 3: 192 };
function roleForSecurity(sec) {
  return SECURITY_ROLE[Math.min(3, Math.max(0, sec | 0))];
}

// ── Permission catalogue cache ───────────────────────────────────────────────
// rbac_permissions / rbac_linked_permissions are seeded by core and rarely
// change at runtime, so keep them in memory. Refresh on demand via ?reload=1.
let _catalogue = null;

async function loadCatalogue() {
  const [perms]  = await authPool.query('SELECT id, name FROM rbac_permissions ORDER BY id');
  const [links]  = await authPool.query('SELECT id, linkedId FROM rbac_linked_permissions');
  const linkedById = new Map();
  for (const { id, linkedId } of links) {
    if (!linkedById.has(id)) linkedById.set(id, []);
    linkedById.get(id).push(linkedId);
  }
  _catalogue = { perms, linkedById };
  return _catalogue;
}

async function getCatalogue() {
  return _catalogue || loadCatalogue();
}

/** BFS the linked-permissions graph from a starting role to all reachable IDs. */
function expandRole(roleId, linkedById) {
  const out = new Set();
  const stack = [roleId];
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id)) continue;
    out.add(id);
    for (const child of linkedById.get(id) || []) stack.push(child);
  }
  return out;
}

// GET /api/rbac/realms — { id, name } for every realm in realmlist (for the realm picker)
router.get('/realms', requireGMLevel(2), async (req, res) => {
  try {
    const [rows] = await authPool.query('SELECT id, name FROM realmlist ORDER BY id');
    res.json({ realms: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rbac/permissions — full catalogue (id, name, linked permission ids)
router.get('/permissions', requireGMLevel(2), async (req, res) => {
  try {
    if (req.query.reload) _catalogue = null;
    const { perms, linkedById } = await getCatalogue();
    const rows = perms.map((p) => ({
      id: p.id,
      name: p.name,
      linked: linkedById.get(p.id) || [],
    }));
    res.json({ permissions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rbac/accounts/:id — security level, raw overrides, effective set
router.get('/accounts/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid account id' });

  const realmIdParam = req.query.realmId;
  const realmId = realmIdParam ? parseInt(realmIdParam, 10) : null; // null = all realms

  try {
    const [[account]] = await authPool.query(
      'SELECT id, username FROM account WHERE id = ?', [id]
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Per-realm gmlevel resolution: realm-specific row > global (-1) row.
    // We return both an effective gmlevel for the requested realm (or all if -1)
    // and the raw account_access entries so the UI can show realm-by-realm.
    const [accessRows] = await authPool.query(
      'SELECT gmlevel, RealmID FROM account_access WHERE id = ?', [id]
    );
    const globalAccess = accessRows.find((r) => r.RealmID === -1);
    const effectiveGmlevel = (() => {
      if (realmId == null) return Math.max(0, ...accessRows.map((r) => r.gmlevel), 0);
      const specific = accessRows.find((r) => r.RealmID === realmId);
      return (specific?.gmlevel ?? globalAccess?.gmlevel ?? 0);
    })();

    // Account-specific permission overrides
    const [overrideRows] = await authPool.query(
      'SELECT permissionId, granted, realmId FROM rbac_account_permissions WHERE accountId = ?',
      [id]
    );

    // Compute effective permission set for the requested realm scope
    const { linkedById } = await getCatalogue();
    const role = roleForSecurity(effectiveGmlevel);
    const effective = expandRole(role, linkedById);

    // Apply overrides to the effective set. When a specific realm is requested,
    // a realm-specific row takes precedence over the global (-1) row for the
    // same permission. When no realm is requested, only global (-1) rows apply
    // (the effective set then represents the cross-realm baseline).
    const applicable = (() => {
      const byPerm = new Map();
      for (const row of overrideRows) {
        if (realmId == null) {
          if (row.realmId === -1) byPerm.set(row.permissionId, row);
          continue;
        }
        if (row.realmId !== -1 && row.realmId !== realmId) continue;
        const cur = byPerm.get(row.permissionId);
        const wins = row.realmId === realmId;
        if (!cur || wins) byPerm.set(row.permissionId, row);
      }
      return [...byPerm.values()];
    })();
    for (const row of applicable) {
      if (row.granted) effective.add(row.permissionId);
      else effective.delete(row.permissionId);
    }

    res.json({
      account: { id: account.id, username: account.username },
      effectiveGmlevel,
      defaultRole: role,
      access: accessRows,
      overrides: overrideRows,
      effective: [...effective].sort((a, b) => a - b),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rbac/accounts/:id/permissions  { permissionId, granted, realmId }
router.post('/accounts/:id/permissions', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const permissionId = parseInt(req.body.permissionId, 10);
  const granted = req.body.granted ? 1 : 0;
  const realmId = req.body.realmId == null || req.body.realmId === '' ? -1 : parseInt(req.body.realmId, 10);

  if (!id || !permissionId) return res.status(400).json({ error: 'id and permissionId required' });
  if (Number.isNaN(realmId)) return res.status(400).json({ error: 'realmId must be a number or -1' });

  try {
    const [[account]] = await authPool.query('SELECT username FROM account WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (realmId !== -1) {
      const [[realm]] = await authPool.query('SELECT id FROM realmlist WHERE id = ?', [realmId]);
      if (!realm) return res.status(400).json({ error: `Unknown realm id: ${realmId}` });
    }

    const [[perm]] = await authPool.query('SELECT id, name FROM rbac_permissions WHERE id = ?', [permissionId]);
    if (!perm) return res.status(400).json({ error: `Unknown permission id: ${permissionId}` });

    await authPool.query(
      `INSERT INTO rbac_account_permissions (accountId, permissionId, granted, realmId)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE granted = VALUES(granted)`,
      [id, permissionId, granted, realmId]
    );

    audit(req, granted ? 'rbac.grant' : 'rbac.deny',
      `account_id=${id} username=${account.username} permission=${permissionId} (${perm.name}) realm=${realmId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rbac/accounts/:id/permissions/:permissionId?realmId=N
router.delete('/accounts/:id/permissions/:permissionId', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const permissionId = parseInt(req.params.permissionId, 10);
  const realmId = req.query.realmId == null || req.query.realmId === '' ? -1 : parseInt(req.query.realmId, 10);

  if (!id || !permissionId) return res.status(400).json({ error: 'id and permissionId required' });
  if (Number.isNaN(realmId)) return res.status(400).json({ error: 'realmId must be a number or -1' });

  try {
    const [[account]] = await authPool.query('SELECT username FROM account WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const [result] = await authPool.query(
      'DELETE FROM rbac_account_permissions WHERE accountId = ? AND permissionId = ? AND realmId = ?',
      [id, permissionId, realmId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Override not found' });
    }
    audit(req, 'rbac.revoke',
      `account_id=${id} username=${account.username} permission=${permissionId} realm=${realmId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
