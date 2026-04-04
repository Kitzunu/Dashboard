/**
 * Process manager — async HTTP client that proxies all server management
 * calls to the standalone server agent (serverAgent.js).
 *
 * Exports the same API as before so existing routes need only minor
 * async/await updates.
 */

const http = require('http');

function agentPort()   { return parseInt(process.env.AGENT_PORT, 10) || 3002; }
function agentSecret() { return process.env.AGENT_SECRET || 'changeme'; }

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = http.request({
      hostname: '127.0.0.1',
      port:     agentPort(),
      path,
      method,
      headers: {
        'Content-Type':  'application/json',
        'X-Agent-Token': agentSecret(),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON from agent')); }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Intentional-stop tracking ─────────────────────────────────────────────────
// Lets the stop route signal that a shutdown was user-initiated so the
// server-status handler can distinguish a deliberate stop from a crash.

const intentionalStops = new Set();

function markIntentionalStop(serverName) {
  intentionalStops.add(serverName);
}

/** Returns true (and clears the flag) if this stop was user-initiated. */
function consumeIntentionalStop(serverName) {
  if (intentionalStops.has(serverName)) {
    intentionalStops.delete(serverName);
    return true;
  }
  return false;
}

// ── Public API (mirrors original synchronous API, now async) ──────────────────

/** No-op: event bridging is handled by serverBridge.js. */
function setIO() {}

async function startServer(serverName) {
  try { return await request('POST', `/${serverName}/start`); }
  catch (err) { return { success: false, error: err.message }; }
}

async function stopServer(serverName, mode = 'exit', delay = 0) {
  try { return await request('POST', `/${serverName}/stop`, { mode, delay }); }
  catch (err) { return { success: false, error: err.message }; }
}

async function setAutoRestart(serverName, enabled) {
  try { return await request('POST', `/${serverName}/autorestart`, { enabled }); }
  catch (err) { return { success: false, error: err.message }; }
}

async function sendCommand(command, serverName) {
  try { return await request('POST', '/command', { command, server: serverName }); }
  catch (err) { return { success: false, error: err.message }; }
}

/** Returns status for a single server. */
async function getStatus(serverName) {
  try {
    const data = await request('GET', '/status');
    return data[serverName] ?? { running: false, autoRestart: false, pid: null, startTime: null };
  } catch {
    return { running: false, autoRestart: false, pid: null, startTime: null };
  }
}

/** Returns { worldserver, authserver, uptime } in one agent round-trip. */
async function getAllStatus() {
  try { return await request('GET', '/status'); }
  catch { return { worldserver: { running: false }, authserver: { running: false }, uptime: null }; }
}

async function getLogs(serverName) {
  try {
    const data = await request('GET', `/${serverName}/logs`);
    return data.logs ?? [];
  } catch { return []; }
}

async function restartAgent() {
  try { return await request('POST', '/restart'); }
  catch (err) { return { success: false, error: err.message }; }
}

module.exports = { setIO, startServer, stopServer, setAutoRestart, sendCommand, getStatus, getAllStatus, getLogs, restartAgent, markIntentionalStop, consumeIntentionalStop };
