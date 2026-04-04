/**
 * IP allowlist middleware.
 *
 * Reads ALLOWED_IPS from the environment (comma-separated).
 * When ALLOWED_IPS is not set, all private/LAN IP addresses are accepted by
 * default so that mobile devices on the same network can connect without
 * extra configuration.
 *
 * Example .env entry:
 *   ALLOWED_IPS=127.0.0.1,::1,192.168.1.50
 */

const DEFAULT_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

function parseAllowlist() {
  const raw = process.env.ALLOWED_IPS;
  if (!raw || !raw.trim()) return DEFAULT_IPS;

  const entries = raw.split(',').map((s) => s.trim()).filter(Boolean);
  // Always include the IPv6-mapped equivalent of any IPv4 entry so that
  // Node servers listening on dual-stack sockets still match.
  const expanded = new Set(entries);
  for (const entry of entries) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(entry)) {
      expanded.add(`::ffff:${entry}`);
    }
  }
  return [...expanded];
}

/** Check whether an IP address belongs to a private / LAN range. */
function isPrivateIP(ip) {
  const clean = ip.replace(/^::ffff:/, '');
  if (clean === '127.0.0.1' || clean === '::1') return true;
  // 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(clean)) return true;
  // IPv6 link-local / unique-local
  if (/^(fe80|fd[0-9a-f]{2}):/i.test(clean)) return true;
  return false;
}

function ipAllowlist(req, res, next) {
  // Re-read process.env each request so changes made via the .env editor take
  // effect immediately without requiring a server restart.
  const allowlist = parseAllowlist();
  // req.ip honours the Express `trust proxy` setting; fall back to socket address.
  const ip = req.ip || req.socket?.remoteAddress || '';
  if (allowlist.includes(ip)) return next();
  // When ALLOWED_IPS is not explicitly configured, accept connections from
  // any private/LAN address (mobile devices, other machines on the LAN).
  if (!process.env.ALLOWED_IPS && isPrivateIP(ip)) return next();
  console.warn(`[ipAllowlist] Blocked request from ${ip}`);
  res.status(403).json({ error: 'Access denied: your IP is not allowlisted' });
}

module.exports = ipAllowlist;
