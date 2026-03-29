/**
 * Server latency monitor — measures TCP round-trip time to the worldserver's
 * game port (default 8085) on a fixed interval and maintains a rolling history
 * of samples from which percentile statistics are derived.
 *
 * Uses process.hrtime.bigint() for sub-millisecond precision.
 * Configurable via env vars: WORLDSERVER_HOST (default 127.0.0.1)
 *                            WORLDSERVER_PORT (default 8085)
 */

const net = require('net');

const MAX_SAMPLES = 120;   // ~60 min at 30 s intervals
const TIMEOUT_MS  = 3000;

// Rolling sample store: [{ ts: unixMs, ms: float }, ...]
const samples = [];

let timer = null;

// ── TCP round-trip measurement ─────────────────────────────────────────────────
function measureTcp(host, port) {
  return new Promise((resolve) => {
    const start  = process.hrtime.bigint();
    const socket = new net.Socket();
    let settled  = false;

    const finish = (connected) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (!connected) { resolve(null); return; }
      const ns = Number(process.hrtime.bigint() - start);
      resolve(parseFloat((ns / 1e6).toFixed(2)));  // nanoseconds → ms (2 dp)
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.connect(port, host, () => finish(true));
    socket.on('error',   () => finish(false));
    socket.on('timeout', () => finish(false));
  });
}

// ── Percentile (nearest-rank) ──────────────────────────────────────────────────
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

// ── Public API ─────────────────────────────────────────────────────────────────
async function sample() {
  const host = process.env.WORLDSERVER_HOST || '127.0.0.1';
  const port = parseInt(process.env.WORLDSERVER_PORT || '8085', 10);
  const ms   = await measureTcp(host, port);
  if (ms === null) return;   // server offline / unreachable — skip

  samples.push({ ts: Date.now(), ms });
  if (samples.length > MAX_SAMPLES) samples.shift();
}

/** Return percentile stats over the rolling window, or null if no data yet. */
function getStats() {
  if (samples.length === 0) return null;

  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const mean   = parseFloat((sorted.reduce((s, v) => s + v, 0) / sorted.length).toFixed(2));

  return {
    count:  samples.length,
    mean,
    median: percentile(sorted, 50),
    p95:    percentile(sorted, 95),
    p99:    percentile(sorted, 99),
    max:    sorted[sorted.length - 1],
  };
}

/** Start periodic sampling. Safe to call multiple times (no-op if already running). */
function start(intervalMs = 30000) {
  if (timer) return;
  sample();                              // take an immediate first sample
  timer = setInterval(sample, intervalMs);
}

module.exports = { start, sample, getStats };
