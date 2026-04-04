/**
 * Server latency monitor — measures TCP round-trip time to each worldserver's
 * game port on a fixed interval and maintains rolling histories from which
 * percentile statistics are derived.
 *
 * Supports multiple worldservers via worldservers.json.
 *
 * Uses process.hrtime.bigint() for sub-millisecond precision.
 */

const net      = require('net');
const wsConfig = require('./worldservers');

const MAX_SAMPLES = 120;   // ~60 min at 30 s intervals
const TIMEOUT_MS  = 3000;

// Per-server rolling sample stores: { [serverId]: [{ ts, ms }, ...] }
const samplesMap = {};

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

// ── Compute stats for a sample array ───────────────────────────────────────────
function computeStats(samples) {
  if (!samples || samples.length === 0) return null;

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

// ── Public API ─────────────────────────────────────────────────────────────────
async function sample() {
  for (const ws of wsConfig.load()) {
    const ms = await measureTcp(ws.host, ws.port);
    if (ms === null) continue;   // server offline / unreachable — skip

    if (!samplesMap[ws.id]) samplesMap[ws.id] = [];
    samplesMap[ws.id].push({ ts: Date.now(), ms });
    if (samplesMap[ws.id].length > MAX_SAMPLES) samplesMap[ws.id].shift();
  }
}

/**
 * Return percentile stats for a specific worldserver, or for the first
 * (default) worldserver when no id is given.  Returns null if no data yet.
 */
function getStats(serverId) {
  const id = serverId || wsConfig.getIds()[0] || 'worldserver';
  return computeStats(samplesMap[id]);
}

/**
 * Return an object mapping each worldserver ID to its stats (or null).
 */
function getAllStats() {
  const result = {};
  for (const id of wsConfig.getIds()) {
    result[id] = computeStats(samplesMap[id]);
  }
  return result;
}

/** Start periodic sampling. Safe to call multiple times (no-op if already running). */
function start(intervalMs = 30000) {
  if (timer) return;
  sample();                              // take an immediate first sample
  timer = setInterval(sample, intervalMs);
}

module.exports = { start, sample, getStats, getAllStats };
