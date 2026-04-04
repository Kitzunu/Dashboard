/**
 * Persists alert thresholds to the dashboard settings database.
 */
const settings = require('./dashboardSettings');

const DEFAULTS = { cpu: 80, memory: 85, graphMinutes: 60, latencyWarn: 100, latencyCritical: 500 };

async function load() {
  try {
    const all = await settings.getAll();
    return {
      cpu:             parseInt(all['threshold.cpu'],             10) || DEFAULTS.cpu,
      memory:          parseInt(all['threshold.memory'],          10) || DEFAULTS.memory,
      graphMinutes:    parseInt(all['threshold.graphMinutes'],    10) || DEFAULTS.graphMinutes,
      latencyWarn:     parseInt(all['threshold.latencyWarn'],     10) || DEFAULTS.latencyWarn,
      latencyCritical: parseInt(all['threshold.latencyCritical'], 10) || DEFAULTS.latencyCritical,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

async function save(data) {
  const merged = { ...DEFAULTS, ...data };
  await settings.setMany({
    'threshold.cpu':             String(merged.cpu),
    'threshold.memory':          String(merged.memory),
    'threshold.graphMinutes':    String(merged.graphMinutes),
    'threshold.latencyWarn':     String(merged.latencyWarn),
    'threshold.latencyCritical': String(merged.latencyCritical),
  });
  return merged;
}

module.exports = { load, save, DEFAULTS };
