const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function authenticateToken(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = user;

  // Check if this session has been revoked
  const { isRevoked, touchSession } = require('../routes/sessions');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  isRevoked(tokenHash).then((revoked) => {
    if (revoked) {
      return res.status(401).json({ error: 'Session has been revoked' });
    }
    touchSession(tokenHash);
    next();
  }).catch(() => {
    // If session check fails, allow request to proceed
    next();
  });
}

function requireGMLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user || req.user.gmlevel < minLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireGMLevel };
