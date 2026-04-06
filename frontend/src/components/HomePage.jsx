import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { useSocket } from '../context/ServerContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── Alert sound (Web Audio API — no external files) ───────────────────────────
// type 'cpu'    → ascending two-tone beep
// type 'memory' → descending two-tone beep
function playAlertSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx   = new AudioCtx();
    const freqs = type === 'cpu' ? [660, 880] : [880, 660];
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type           = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.setValueAtTime(0.25, t + 0.16);
      gain.gain.linearRampToValueAtTime(0, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch {}
}

// ── Browser notification helper ───────────────────────────────────────────────
function fireNotification(type, pct, threshold, { sound = true, popup = true } = {}) {
  if (sound) playAlertSound(type);
  if (!popup) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const label = type === 'cpu' ? 'CPU' : 'Memory';
  try {
    new Notification(`⚠ ${label} Alert — AzerothCore Dashboard`, {
      body: `${label} usage is at ${pct}% (threshold: ${threshold}%)`,
      icon: '/img/icon.png',
      tag:  `ac-alert-${type}`,   // replaces any existing notification of same type
    });
  } catch {}
}

// ── Alerts dropdown ───────────────────────────────────────────────────────────
function AlertsDropdown({ notifEnabled, soundEnabled, onToggleNotif, onToggleSound }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRequestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') toast('Browser notifications enabled');
    else if (result === 'denied') toast('Notifications blocked — enable them in browser settings', 'error');
  };

  // Derive button label
  const anyOn = notifEnabled || soundEnabled;
  const btnLabel = anyOn ? '🔔 Alerts' : '🔕 Alerts';

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className={`btn btn-ghost btn-xs${anyOn ? '' : ' btn-muted'}`}
        onClick={() => setOpen((o) => !o)}
        title="Alert settings"
      >
        {btnLabel} <span className={`action-multiselect-chevron${open ? ' open' : ''}`}>›</span>
      </button>

      {open && (
        <div className="action-multiselect-dropdown" style={{ right: 0, left: 'auto', width: 220 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Alert Settings
          </div>

          {/* Master alerts toggle (popup notifications) */}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', gap: 8 }}>
            <span style={{ fontSize: 13 }}>
              {notifEnabled ? '🔔' : '🔕'} Popup Alerts
            </span>
            {!supported || permission === 'unsupported' ? (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Not supported</span>
            ) : permission === 'denied' ? (
              <span style={{ fontSize: 11, color: 'var(--color-danger, #e53e3e)' }}>Blocked</span>
            ) : permission === 'default' ? (
              <button className="btn btn-primary btn-xs" onClick={handleRequestPermission} style={{ fontSize: 11 }}>Enable</button>
            ) : (
              <input type="checkbox" checked={notifEnabled} onChange={onToggleNotif} />
            )}
          </label>

          {/* Sound toggle */}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', gap: 8, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13 }}>
              {soundEnabled ? '🔊' : '🔇'} Alert Sound
            </span>
            <input type="checkbox" checked={soundEnabled} onChange={onToggleSound} />
          </label>
        </div>
      )}
    </div>
  );
}

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

// ── Dashboard backend card ────────────────────────────────────────────────────
function DashboardCard({ dashboard }) {
  const agentConnected = dashboard?.agentConnected ?? false;

  return (
    <div className="server-overview-card">
      <div className="server-overview-card-header">
        <span className="status-dot dot-green" />
        <span className="server-overview-name">Dashboard</span>
      </div>
      <div className="server-overview-detail">
        <span className="detail-label">Backend</span>
        <span className="detail-value text-green">Online</span>
      </div>
      <div className="server-overview-detail">
        <span className="detail-label">Server Agent</span>
        <span className={`detail-value ${agentConnected ? 'text-green' : 'text-red'}`}>
          {agentConnected ? 'Connected' : 'Disconnected'}
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

// ── Resource graph (CPU or Memory) ────────────────────────────────────────────
function ResourceGraph({ title, dataKey, detail, history, threshold, color, graphMinutes }) {
  const W = 600, H = 100, PAD_X = 8, PAD_Y = 8;

  const warn = threshold != null && history?.length > 0 &&
    history[history.length - 1][dataKey] >= threshold;

  const hasData = history && history.length >= 2;

  let svgContent = null;
  if (hasData) {
    const toX = (i) => PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
    const toY = (v) => PAD_Y + (1 - v / 100) * (H - PAD_Y * 2);

    const linePoints = history.map((p, i) => `${toX(i)},${toY(p[dataKey])}`).join(' ');
    const firstX = toX(0), lastX = toX(history.length - 1), bottomY = H - PAD_Y;
    const polyPoints = `${firstX},${bottomY} ` + linePoints + ` ${lastX},${bottomY}`;

    const lineColor = warn ? 'var(--warn)' : color;
    const FILL_COLORS = {
      'var(--blue)':  'rgba(91,155,213,0.12)',
      'var(--green)': 'rgba(61,220,132,0.10)',
    };
    const fillColor = warn ? 'rgba(232,168,56,0.10)' : (FILL_COLORS[color] ?? 'rgba(91,155,213,0.10)');
    const threshY = threshold != null ? toY(threshold) : null;

    svgContent = (
      <svg className="resource-graph-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {threshY != null && (
          <line x1={PAD_X} y1={threshY} x2={W - PAD_X} y2={threshY}
            stroke="rgba(232,168,56,0.4)" strokeWidth="1" strokeDasharray="4 3" />
        )}
        <polygon points={polyPoints} fill={fillColor} stroke="none" />
        <polyline points={linePoints} fill="none" stroke={lineColor}
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <div className={`resource-graph-card${warn ? ' resource-graph-warn' : ''}`}>
      <div className="resource-graph-header">
        <span className="resource-graph-title">
          {warn && <span className="resource-warn-icon" title={`Above ${threshold}% threshold`}>⚠ </span>}
          {title}
          <span className="resource-graph-window">last {graphMinutes ?? 60} min</span>
        </span>
        <span className={`resource-graph-detail${warn ? ' resource-warn-text' : ''}`}>
          {detail}
          {threshold != null && (
            <span className="threshold-badge" style={{ marginLeft: 8 }}>threshold {threshold}%</span>
          )}
        </span>
      </div>
      {hasData ? svgContent : (
        <div className="sparkline-empty">No data yet</div>
      )}
    </div>
  );
}

// ── Latency panel ─────────────────────────────────────────────────────────────
function latencyColor(ms) {
  if (ms >= 10)  return 'var(--red)';
  if (ms >= 5)   return 'var(--warn)';
  if (ms >= 2)   return 'var(--text)';
  return 'var(--green)';
}

function LatencyPanel({ latency, label }) {
  const title = label ? `${label} Latency` : 'Server Latency';
  if (!latency) {
    return (
      <div className="latency-panel">
        <div className="latency-panel-header">
          <span className="latency-panel-title">{title}</span>
          <span className="td-muted" style={{ fontSize: 12 }}>No data yet — collecting samples…</span>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Mean',   value: latency.mean   },
    { label: 'Median', value: latency.median  },
    { label: 'P95',    value: latency.p95     },
    { label: 'P99',    value: latency.p99     },
    { label: 'Max',    value: latency.max     },
  ];

  return (
    <div className="latency-panel">
      <div className="latency-panel-header">
        <span className="latency-panel-title">{title}</span>
        <span className="td-muted" style={{ fontSize: 12 }}>{latency.count} sample{latency.count !== 1 ? 's' : ''}</span>
      </div>
      <div className="latency-stats-grid">
        {stats.map(({ label, value }) => (
          <div key={label} className="latency-stat-cell">
            <span className="latency-stat-label">{label}</span>
            <span className="latency-stat-value" style={{ color: latencyColor(value) }}>
              {value} <span className="latency-stat-unit">ms</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const socket = useSocket();
  const [overview, setOverview]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [thresholds, setThresholds] = useState({ cpu: 80, memory: 85, graphMinutes: 60 });

  const [notifEnabled, setNotifEnabled] = useLocalStorage('ac-notif-enabled', true);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('ac-sound-enabled', true);

  // Refs so the socket callback always reads current values without stale closures
  const thresholdsRef    = useRef({ cpu: 80, memory: 85, graphMinutes: 60 });
  const alertStateRef    = useRef({ cpu: false, mem: false });
  const notifEnabledRef  = useRef(notifEnabled);
  const soundEnabledRef  = useRef(soundEnabled);
  const agentConnectedRef = useRef(null); // null = unknown (first load)

  // Keep refs in sync whenever state changes
  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);
  useEffect(() => { notifEnabledRef.current = notifEnabled; }, [notifEnabled]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const handleToggleNotif = () => {
    const next = !notifEnabledRef.current;
    notifEnabledRef.current = next;
    setNotifEnabled(next);
    toast(next ? 'Alert notifications enabled' : 'Alert notifications muted');
  };

  const handleToggleSound = () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    toast(next ? 'Alert sounds enabled' : 'Alert sounds muted');
  };

  // Check alert transitions and fire notifications as needed
  const checkAlerts = (cpuPct, memPct) => {
    const t        = thresholdsRef.current;
    const cpuAlert = cpuPct  >= t.cpu;
    const memAlert = memPct  >= t.memory;
    const prev     = alertStateRef.current;

    if (notifEnabledRef.current || soundEnabledRef.current) {
      const opts = { sound: soundEnabledRef.current, popup: notifEnabledRef.current };
      if (cpuAlert && !prev.cpu) fireNotification('cpu',    cpuPct,  t.cpu,    opts);
      if (memAlert && !prev.mem) fireNotification('memory', memPct,  t.memory, opts);
    }

    alertStateRef.current = { cpu: cpuAlert, mem: memAlert };
  };

  const applyOverviewData = (data) => {
    setOverview(data);
    if (data.thresholds) {
      setThresholds(data.thresholds);
      thresholdsRef.current = data.thresholds;
    }
    const sys    = data.system ?? {};
    const cpuPct = sys.cpuUsage ?? 0;
    const memPct = sys.memPct ?? (sys.totalMem > 0
      ? Math.round(((sys.totalMem - sys.freeMem) / sys.totalMem) * 100)
      : 0);
    checkAlerts(cpuPct, memPct);

    const agentNow  = data.dashboard?.agentConnected ?? false;
    const prevAgent = agentConnectedRef.current;
    if (prevAgent === true && !agentNow) {
      toast('Server Agent disconnected — game servers may be unmanaged', 'error');
    }
    agentConnectedRef.current = agentNow;
    setError(null);
    setLoading(false);
  };

  // Initial HTTP load
  useEffect(() => {
    api.getOverview()
      .then(applyOverviewData)
      .catch((err) => {
        setError(err.message || 'Failed to load overview');
        if (agentConnectedRef.current !== 'backend-down') {
          toast('Dashboard backend is unreachable', 'error');
          agentConnectedRef.current = 'backend-down';
        }
        setLoading(false);
      });
  }, []);

  // Live updates via socket push
  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe-overview');
    socket.on('overview:update', applyOverviewData);

    const handleReconnect = () => {
      socket.emit('subscribe-overview');
      api.getOverview().then(applyOverviewData).catch(() => {});
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.emit('unsubscribe-overview');
      socket.off('overview:update', applyOverviewData);
      socket.off('connect', handleReconnect);
    };
  }, [socket]);

  if (loading) return <div className="page"><div className="loading-text">Loading overview…</div></div>;
  if (error && !overview) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  const servers       = overview?.servers       ?? {};
  const worldservers  = overview?.worldservers  ?? [{ id: 'worldserver', name: 'World Server' }];
  const dashboard     = overview?.dashboard     ?? {};
  const players       = overview?.players       ?? {};
  const tickets       = overview?.tickets       ?? {};
  const bans          = overview?.bans          ?? {};
  const system        = overview?.system        ?? {};
  const playerHistory   = overview?.playerHistory   ?? [];
  const resourceHistory = overview?.resourceHistory ?? [];
  const motd            = overview?.motd            ?? '';
  const version       = overview?.version       ?? null;
  const serverLatency = overview?.serverLatency  ?? {};
  const anyWorldRunning = worldservers.some((ws) => servers[ws.id]?.running);

  const memPct = system.memPct ?? (system.totalMem > 0
    ? Math.round(((system.totalMem - system.freeMem) / system.totalMem) * 100)
    : 0);
  const cpuPct = system.cpuUsage ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        <div className="overview-header-controls">
          <AlertsDropdown
            notifEnabled={notifEnabled}
            soundEnabled={soundEnabled}
            onToggleNotif={handleToggleNotif}
            onToggleSound={handleToggleSound}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Server cards */}
      <div className="home-grid">
        {worldservers.map((ws) => (
          <ServerOverviewCard key={ws.id} name={ws.id} displayName={ws.name} info={servers[ws.id]} />
        ))}
        <ServerOverviewCard name="authserver"  displayName="Auth Server"  info={servers.authserver} />
        <DashboardCard dashboard={dashboard} />
      </div>

      {/* Stat cards */}
      <div className="home-metrics-row">
        <StatCard label="Players Online" value={anyWorldRunning ? (players.current ?? 0) : 0} />
        <StatCard label="Open Tickets"   value={tickets.open    ?? 0} />
        <StatCard label="Active Bans"    value={bans.active     ?? 0} />
      </div>

      {/* Resource graphs */}
      <div className="resource-graphs-row">
        <ResourceGraph
          title="System Memory"
          dataKey="memory"
          detail={system.totalMem > 0 ? `${formatGB(system.totalMem - system.freeMem)} GB / ${formatGB(system.totalMem)} GB (${memPct}%)` : '—'}
          history={resourceHistory}
          threshold={thresholds.memory}
          color="var(--blue)"
          graphMinutes={thresholds.graphMinutes ?? 60}
        />
        <ResourceGraph
          title="CPU Usage"
          dataKey="cpu"
          detail={system.cpuCount > 0 ? `${cpuPct}% across ${system.cpuCount ?? '?'} core(s)` : '—'}
          history={resourceHistory}
          threshold={thresholds.cpu}
          color="var(--green)"
          graphMinutes={thresholds.graphMinutes ?? 60}
        />
      </div>

      {/* Server latency */}
      {worldservers.map((ws) => (
        <LatencyPanel key={ws.id} latency={serverLatency[ws.id] ?? null} label={ws.name} />
      ))}

      {/* Sparkline */}
      <Sparkline playerHistory={playerHistory} currentCount={anyWorldRunning ? (players.current ?? 0) : 0} />

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
