const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { dashPool } = require('../db');
const { audit } = require('../audit');

// Auto-create active_sessions table
dashPool.query(`
  CREATE TABLE IF NOT EXISTS \`active_sessions\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`username\` VARCHAR(64) NOT NULL,
    \`token_hash\` VARCHAR(64) NOT NULL,
    \`ip\` VARCHAR(45) NOT NULL DEFAULT '',
    \`user_agent\` VARCHAR(512) NOT NULL DEFAULT '',
    \`gmlevel\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`last_active\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`revoked\` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (\`id\`),
    KEY \`idx_username\` (\`username\`),
    KEY \`idx_token_hash\` (\`token_hash\`),
    KEY \`idx_revoked\` (\`revoked\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`).catch(() => {});

async function registerSession(username, tokenHash, ip, userAgent, gmlevel) {
  try {
    await dashPool.query(
      'INSERT INTO active_sessions (username, token_hash, ip, user_agent, gmlevel) VALUES (?, ?, ?, ?, ?)',
      [username, tokenHash, ip, userAgent || '', gmlevel]
    );
  } catch (err) {
    console.error('[sessions] Failed to register session:', err.message);
  }
}

async function revokeSession(id) {
  await dashPool.query(
    'UPDATE active_sessions SET revoked = 1 WHERE id = ?',
    [id]
  );
}

async function isRevoked(tokenHash) {
  try {
    const [[row]] = await dashPool.query(
      'SELECT revoked FROM active_sessions WHERE token_hash = ? ORDER BY id DESC LIMIT 1',
      [tokenHash]
    );
    if (!row) return false;
    return !!row.revoked;
  } catch {
    return false;
  }
}

async function touchSession(tokenHash) {
  try {
    await dashPool.query(
      'UPDATE active_sessions SET last_active = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked = 0',
      [tokenHash]
    );
  } catch {
    // fire-and-forget
  }
}

router.get('/', requireGMLevel(3), async (req, res) => {
  try {
    const [rows] = await dashPool.query(
      'SELECT id, username, ip, user_agent, gmlevel, created_at, last_active FROM active_sessions WHERE revoked = 0 ORDER BY last_active DESC'
    );
    // Compute the token hash from the current request to identify this session
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let currentSessionId = null;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [[current]] = await dashPool.query(
        'SELECT id FROM active_sessions WHERE token_hash = ? AND revoked = 0 ORDER BY id DESC LIMIT 1',
        [tokenHash]
      );
      if (current) currentSessionId = current.id;
    }
    res.json({ sessions: rows, currentSessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireGMLevel(3), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    // Look up session details before revoking
    const [[session]] = await dashPool.query(
      'SELECT username, ip FROM active_sessions WHERE id = ?',
      [id]
    );
    await revokeSession(id);
    const details = session
      ? `session_id=${id} username=${session.username} ip=${session.ip}`
      : `session_id=${id}`;
    audit(req, 'session.revoke', details);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', requireGMLevel(3), async (req, res) => {
  try {
    const { exceptTokenHash } = req.body || {};
    if (!exceptTokenHash) {
      return res.status(400).json({ error: 'exceptTokenHash is required' });
    }
    const [result] = await dashPool.query(
      'UPDATE active_sessions SET revoked = 1 WHERE token_hash != ? AND revoked = 0',
      [exceptTokenHash]
    );
    audit(req, 'session.revoke_all', `Revoked ${result.affectedRows} sessions`);
    res.json({ success: true, revoked: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.registerSession = registerSession;
module.exports.revokeSession = revokeSession;
module.exports.isRevoked = isRevoked;
module.exports.touchSession = touchSession;
