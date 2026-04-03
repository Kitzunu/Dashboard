/**
 * Discord webhook integration.
 * Sends formatted embeds for server crash, threshold breach, and agent disconnect alerts.
 * Webhook URL comes from DISCORD_WEBHOOK_URL env var; everything else is in dashboardSettings.
 */

const https    = require('https');
const http     = require('http');
const { URL }  = require('url');
const settings = require('./dashboardSettings');

// ── Low-level HTTP sender ─────────────────────────────────────────────────────

function postWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(webhookUrl); } catch { return reject(new Error('Invalid webhook URL')); }

    const body    = JSON.stringify(payload);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = lib.request(options, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Discord returned ${res.statusCode}`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Template interpolation ────────────────────────────────────────────────────

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

// ── Embed builders ────────────────────────────────────────────────────────────

const COLORS = { red: 15548997, orange: 16164913, green: 5763719 };

function buildEmbed(title, description, color) {
  return {
    embeds: [{
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: 'AzerothCore Dashboard' },
    }],
  };
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function getWebhookUrl() {
  return process.env.DISCORD_WEBHOOK_URL || '';
}

async function isGloballyEnabled() {
  return settings.getBoolean('discord.enabled');
}


async function getPayloadMeta() {
  const all       = await settings.getAll();
  const username  = all['discord.webhook_username']   || 'AzerothCore Dashboard';
  const saved     = all['discord.webhook_avatar_url'] || '';
  const avatarUrl = saved || 'https://raw.githubusercontent.com/Kitzunu/Dashboard/master/frontend/img/icon.png';
  return { username, avatar_url: avatarUrl };
}

async function buildPayload(embed) {
  return { ...(await getPayloadMeta()), ...embed };
}

// ── Public API ────────────────────────────────────────────────────────────────

async function sendServerCrash(server) {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_server_crash'))) return;

  const displayName = server === 'worldserver' ? 'World Server' : 'Auth Server';
  const template    = (await settings.get('discord.message_server_crash')) || '**{server}** has gone offline.';
  const description = interpolate(template, { server: displayName });

  await postWebhook(url, await buildPayload(buildEmbed(`🔴 ${displayName} Offline`, description, COLORS.red)));
}

async function sendServerOnline(server) {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_server_online'))) return;

  const displayName = server === 'worldserver' ? 'World Server' : 'Auth Server';
  const template    = (await settings.get('discord.message_server_online')) || '**{server}** is online.';
  const description = interpolate(template, { server: displayName });

  await postWebhook(url, await buildPayload(buildEmbed(`🟢 ${displayName} Online`, description, COLORS.green)));
}

async function sendThresholdBreach(resource, pct, threshold) {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_threshold'))) return;

  const label       = resource === 'cpu' ? 'CPU' : 'Memory';
  const template    = (await settings.get('discord.message_threshold')) || '**{resource}** usage is at **{pct}%** (threshold: {threshold}%).';
  const description = interpolate(template, { resource: label, pct, threshold });

  await postWebhook(url, await buildPayload(buildEmbed(`⚠️ ${label} Threshold Breached`, description, COLORS.orange)));
}

async function sendAgentDisconnect() {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_agent_disconnect'))) return;

  const template = (await settings.get('discord.message_agent_disconnect')) || 'The server agent has disconnected. Game servers may be unmanaged.';

  await postWebhook(url, await buildPayload(buildEmbed('🔴 Agent Disconnected', template, COLORS.red)));
}

async function sendLatencyAlert(severity, meanMs, threshold) {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_threshold'))) return;

  const label       = severity === 'critical' ? 'Critical' : 'Warning';
  const color       = severity === 'critical' ? COLORS.red : COLORS.orange;
  const description = `Server latency mean is **${meanMs} ms** (threshold: ${threshold} ms).`;

  await postWebhook(url, await buildPayload(buildEmbed(`⚠️ Latency ${label}`, description, color)));
}

async function sendServerStop(server) {
  const url = getWebhookUrl();
  if (!url) return;
  if (!(await isGloballyEnabled())) return;
  if (!(await settings.getBoolean('discord.alert_server_stop'))) return;

  const displayName = server === 'worldserver' ? 'World Server' : 'Auth Server';
  const template    = (await settings.get('discord.message_server_stop')) || '**{server}** was stopped manually.';
  const description = interpolate(template, { server: displayName });
  await postWebhook(url, await buildPayload(buildEmbed(`🔴 ${displayName} Offline`, description, COLORS.red)));
}

async function sendTest(webhookUrl) {
  await postWebhook(webhookUrl, await buildPayload(
    buildEmbed('✅ Webhook Test', 'AzerothCore Dashboard webhook is configured correctly.', COLORS.green)
  ));
}

module.exports = { sendServerCrash, sendServerStop, sendServerOnline, sendThresholdBreach, sendAgentDisconnect, sendLatencyAlert, sendTest };
