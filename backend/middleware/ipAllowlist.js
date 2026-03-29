/**
 * IP allowlist middleware.
 *
 * Reads ALLOWED_IPS from the environment (comma-separated).
 * Defaults to localhost only: 127.0.0.1, ::1, and the IPv6-mapped form.
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

const allowlist = parseAllowlist();

function ipAllowlist(req, res, next) {
  // req.ip honours the Express `trust proxy` setting; fall back to socket address.
  const ip = req.ip || req.socket?.remoteAddress || '';
  if (allowlist.includes(ip)) return next();
  console.warn(`[ipAllowlist] Blocked request from ${ip}`);
  res.status(403).json({ error: 'Access denied: your IP is not allowlisted' });
}

module.exports = ipAllowlist;
