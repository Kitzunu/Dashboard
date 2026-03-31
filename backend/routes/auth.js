const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authPool } = require('../db');
const { logAudit, getIP } = require('../audit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes' },
});

// AzerothCore SRP6 constants (WoW SRP6)
const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7');
const g = 7n;

function bufferToBigIntLE(buf) {
  let hex = '';
  for (let i = buf.length - 1; i >= 0; i--) {
    hex += buf[i].toString(16).padStart(2, '0');
  }
  return BigInt('0x' + hex);
}

function modPow(base, exp, mod) {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

function computeVerifier(username, password, salt) {
  const h1 = crypto.createHash('sha1')
    .update(Buffer.from(`${username.toUpperCase()}:${password.toUpperCase()}`, 'utf8'))
    .digest();

  const xHash = crypto.createHash('sha1')
    .update(salt)
    .update(h1)
    .digest();

  const x = bufferToBigIntLE(xHash);
  return modPow(g, x, N);
}

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [rows] = await authPool.query(
      `SELECT a.id, a.username, a.salt, a.verifier,
              COALESCE(MAX(aa.gmlevel), 0) AS gmlevel
       FROM account a
       LEFT JOIN account_access aa ON a.id = aa.id
       WHERE a.username = ?
       GROUP BY a.id, a.username, a.salt, a.verifier`,
      [username.toUpperCase()]
    );

    if (rows.length === 0) {
      logAudit(username.toUpperCase(), getIP(req), 'login', 'Account not found', false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const account = rows[0];

    const salt = Buffer.isBuffer(account.salt) ? account.salt : Buffer.from(account.salt, 'binary');
    const storedVerifier = Buffer.isBuffer(account.verifier) ? account.verifier : Buffer.from(account.verifier, 'binary');

    const computedVerifier = computeVerifier(username, password, salt);
    const storedVerifierInt = bufferToBigIntLE(storedVerifier);

    if (computedVerifier !== storedVerifierInt) {
      logAudit(account.username, getIP(req), 'login', 'Wrong password', false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (account.gmlevel < 1) {
      logAudit(account.username, getIP(req), 'login', 'Insufficient GM level', false);
      return res.status(403).json({ error: 'This account does not have GM access to the dashboard' });
    }

    const token = jwt.sign(
      { id: account.id, username: account.username, gmlevel: account.gmlevel },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    const idleTimeoutMinutes = parseInt(process.env.IDLE_TIMEOUT_MINUTES, 10) || 0;
    logAudit(account.username, getIP(req), 'login', `GM level ${account.gmlevel}`);
    res.json({ token, username: account.username, gmlevel: account.gmlevel, idleTimeoutMinutes });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/auth/logout — purely for audit logging (token invalidation is client-side)
const { authenticateToken } = require('../middleware/auth');
router.post('/logout', authenticateToken, (req, res) => {
  logAudit(req.user.username, getIP(req), 'logout');
  res.json({ success: true });
});

module.exports = router;
