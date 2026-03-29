import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUptime(startTime) {
  if (!startTime) return '—';
  const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  if (elapsed === 0) return '—';
  const d = Math.floor(elapsed / 86400);
  const h = Math.floor((elapsed % 86400) / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatGB(bytes) {
  return (bytes / 1073741824).toFixed(1);
}

// ── Server overview card ──────────────────────────────────────────────────────
function ServerOverviewCard({ name, displayName, info }) {
  const [uptime, setUptime] = useState(() => formatUptime(info?.startTime));

  useEffect(() => {
    if (!info?.running || !info?.startTime) { setUptime('—'); return; }
    setUptime(formatUptime(info.startTime));
    const id = setInterval(() => setUptime(formatUptime(info.startTime)), 1000);
    return () => clearInterval(id);
  }, [info?.running, info?.startTime]);

  const running = info?.running ?? false;

  return (
    <div className="server-overview-card">
      <div className="server-overview-card-header">
        <span className={`status-dot ${running ? 'dot-green' : 'dot-red'}`} />
        <span className="server-overview-name">{displayName}</span>
      </div>
      <div className="server-overview-detail">
        <span className="detail-label">PID</span>
        <span className="detail-value">{running && info?.pid ? info.pid : '—'}</span>
      </div>
      <div className="server-overview-detail">
        <span className="detail-label">Uptime</span>
        <span className="detail-value">{running ? uptime : '—'}</span>
      </div>
      <div className="server-overview-detail">
        <span className="detail-label">Status</span>
        <span className={`detail-value ${running ? 'text-green' : 'text-red'}`}>
          {running ? 'Running' : 'Stopped'}
        </span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Resource bar (memory or CPU) ──────────────────────────────────────────────
function ResourceBar({ title, pct, detail, threshold }) {
  const warn     = threshold != null && pct >= threshold;
  const critical = threshold != null && pct >= Math.min(threshold + 10, 95);
  const barColor = critical ? 'var(--red)' : warn ? 'var(--warn)' : null; // null = default gradient

  return (
    <div className="memory-bar-wrap">
      <div className="memory-bar-header">
        <span className="memory-bar-title">
          {warn && <span className="resource-warn-icon" title={`Above ${threshold}% threshold`}>⚠ </span>}
          {title}
        </span>
        <span className={`memory-bar-stats ${warn ? 'resource-warn-text' : ''}`}>
          {detail}
          {threshold != null && (
            <span className="threshold-badge" style={{ marginLeft: 8 }}>
              threshold {threshold}%
            </span>
          )}
        </span>
      </div>
      <div className="memory-bar">
        <div
          className="memory-bar-fill"
          style={{
            width: `${pct}%`,
            ...(barColor ? { background: barColor } : {}),
          }}
        />
      </div>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ playerHistory, currentCount }) {
  if (!playerHistory || playerHistory.length < 2) {
    return (
      <div className="sparkline-card">
        <div className="sparkline-card-header">
          <span className="sparkline-title">Players Online (last hour)</span>
        </div>
        <div className="sparkline-empty">No data yet</div>
      </div>
    );
  }

  const W = 600, H = 120, PAD_X = 8, PAD_Y = 16;
  const counts = playerHistory.map((p) => p.count);
  const minVal = Math.min(...counts);
  const maxVal = Math.max(...counts);
  const range  = maxVal - minVal || 1;
  const toX    = (i) => PAD_X + (i / (playerHistory.length - 1)) * (W - PAD_X * 2);
  const toY    = (v) => PAD_Y + (1 - (v - minVal) / range) * (H - PAD_Y * 2);

  const linePoints = playerHistory.map((p, i) => `${toX(i)},${toY(p.count)}`).join(' ');
  const firstX = toX(0), lastX = toX(playerHistory.length - 1), bottomY = H - PAD_Y;
  const polyPoints = `${firstX},${bottomY} ` + linePoints + ` ${lastX},${bottomY}`;

  return (
    <div className="sparkline-card">
      <div className="sparkline-card-header">
        <span className="sparkline-title">Players Online (last hour)</span>
        <span className="sparkline-current">{currentCount ?? 0}</span>
      </div>
      <svg className="sparkline-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polygon points={polyPoints} fill="rgba(201,162,39,0.1)" stroke="none" />
        <polyline points={linePoints} fill="none" stroke="var(--gold)"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Threshold settings ────────────────────────────────────────────────────────
function ThresholdSettings({ thresholds, onSaved }) {
  const [open, setOpen]   = useState(false);
  const [cpu, setCpu]     = useState(thresholds.cpu);
  const [mem, setMem]     = useState(thresholds.memory);
  const [busy, setBusy]   = useState(false);

  // Keep in sync if parent reloads
  useEffect(() => { setCpu(thresholds.cpu); setMem(thresholds.memory); }, [thresholds]);

  const isDirty = cpu !== thresholds.cpu || mem !== thresholds.memory;

  const handleSave = async () => {
    setBusy(true);
    try {
      const saved = await api.saveThresholds({ cpu, memory: mem });
      toast('Alert thresholds saved');
      onSaved(saved);
      setOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="threshold-settings">
      <button className="btn btn-ghost btn-xs threshold-toggle" onClick={() => setOpen((o) => !o)}>
        ⚙ Alert Thresholds {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="threshold-panel">
          <div className="threshold-row">
            <label>CPU warning at</label>
            <div className="threshold-input-wrap">
              <input type="number" min="1" max="100" value={cpu}
                onChange={(e) => setCpu(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
              <span className="td-muted">%</span>
            </div>
          </div>
          <div className="threshold-row">
            <label>Memory warning at</label>
            <div className="threshold-input-wrap">
              <input type="number" min="1" max="100" value={mem}
                onChange={(e) => setMem(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
              <span className="td-muted">%</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-xs" onClick={handleSave}
              disabled={!isDirty || busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [overview, setOverview]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [thresholds, setThresholds] = useState({ cpu: 80, memory: 85 });
  const intervalRef = useRef(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
      if (data.thresholds) setThresholds(data.thresholds);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load overview');
      toast(err.message || 'Failed to load overview', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    intervalRef.current = setInterval(fetchOverview, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) return <div className="page"><div className="loading-text">Loading overview…</div></div>;
  if (error && !overview) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  const servers       = overview?.servers       ?? {};
  const players       = overview?.players       ?? {};
  const tickets       = overview?.tickets       ?? {};
  const bans          = overview?.bans          ?? {};
  const system        = overview?.system        ?? {};
  const playerHistory = overview?.playerHistory ?? [];
  const motd          = overview?.motd          ?? '';
  const version       = overview?.version       ?? null;

  const memPct  = system.memPct  ?? (system.totalMem > 0 ? Math.round(((system.totalMem - system.freeMem) / system.totalMem) * 100) : 0);
  const cpuPct  = system.cpuUsage ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        <ThresholdSettings thresholds={thresholds} onSaved={setThresholds} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Server cards */}
      <div className="home-grid">
        <ServerOverviewCard name="worldserver" displayName="World Server" info={servers.worldserver} />
        <ServerOverviewCard name="authserver"  displayName="Auth Server"  info={servers.authserver} />
      </div>

      {/* Stat cards */}
      <div className="home-metrics-row">
        <StatCard label="Players Online" value={players.current ?? 0} />
        <StatCard label="Open Tickets"   value={tickets.open    ?? 0} />
        <StatCard label="Active Bans"    value={bans.active     ?? 0} />
      </div>

      {/* Resource bars */}
      {system.totalMem > 0 && (
        <>
          <ResourceBar
            title="System Memory"
            pct={memPct}
            detail={`${formatGB(system.totalMem - system.freeMem)} GB used / ${formatGB(system.totalMem)} GB total (${memPct}%)`}
            threshold={thresholds.memory}
          />
          <ResourceBar
            title="CPU Usage"
            pct={cpuPct}
            detail={`${cpuPct}% across ${system.cpuCount ?? '?'} core(s)`}
            threshold={thresholds.cpu}
          />
        </>
      )}

      {/* Sparkline */}
      <Sparkline playerHistory={playerHistory} currentCount={players.current ?? 0} />

      {/* Version */}
      {version && (
        <div className="overview-version">
          {version.core_version && (
            <>
              <span className="overview-version-label">Core Version</span>
              <span className="overview-version-value">{version.core_version}</span>
            </>
          )}
          <div className="overview-version-row">
            {version.core_revision && (
              <div className="overview-version-cell">
                <span className="overview-version-label">Core Revision</span>
                <a
                  className="overview-version-value overview-version-link"
                  href={`https://github.com/azerothcore/azerothcore-wotlk/commit/${version.core_revision}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {version.core_revision}
                </a>
              </div>
            )}
            {version.db_version && (
              <div className="overview-version-cell">
                <span className="overview-version-label">DB Version</span>
                <span className="overview-version-value">{version.db_version}</span>
              </div>
            )}
            {version.cache_id != null && (
              <div className="overview-version-cell">
                <span className="overview-version-label">Cache ID</span>
                <span className="overview-version-value">{version.cache_id}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOTD */}
      {motd && (
        <div className="motd-current" style={{ marginBottom: 0 }}>
          <span className="motd-current-label">Message of the Day</span>
          <span className="motd-current-value">{motd}</span>
        </div>
      )}
    </div>
  );
}
