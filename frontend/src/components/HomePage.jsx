import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

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

function ServerOverviewCard({ name, displayName, info }) {
  const [uptime, setUptime] = useState(() => formatUptime(info?.startTime));

  useEffect(() => {
    if (!info?.running || !info?.startTime) {
      setUptime('—');
      return;
    }
    setUptime(formatUptime(info.startTime));
    const id = setInterval(() => {
      setUptime(formatUptime(info.startTime));
    }, 1000);
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

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function MemoryBar({ totalMem, freeMem }) {
  const used = totalMem - freeMem;
  const pct = totalMem > 0 ? Math.round((used / totalMem) * 100) : 0;

  return (
    <div className="memory-bar-wrap">
      <div className="memory-bar-header">
        <span className="memory-bar-title">System Memory</span>
        <span className="memory-bar-stats">
          {formatGB(used)} GB used / {formatGB(totalMem)} GB total ({pct}%)
        </span>
      </div>
      <div className="memory-bar">
        <div className="memory-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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

  const W = 600;
  const H = 120;
  const PAD_X = 8;
  const PAD_Y = 16;

  const counts = playerHistory.map((p) => p.count);
  const minVal = Math.min(...counts);
  const maxVal = Math.max(...counts);
  const range = maxVal - minVal || 1;

  const toX = (i) => PAD_X + (i / (playerHistory.length - 1)) * (W - PAD_X * 2);
  const toY = (v) => PAD_Y + (1 - (v - minVal) / range) * (H - PAD_Y * 2);

  const linePoints = playerHistory
    .map((p, i) => `${toX(i)},${toY(p.count)}`)
    .join(' ');

  const firstX = toX(0);
  const lastX = toX(playerHistory.length - 1);
  const bottomY = H - PAD_Y;

  const polyPoints =
    `${firstX},${bottomY} ` + linePoints + ` ${lastX},${bottomY}`;

  return (
    <div className="sparkline-card">
      <div className="sparkline-card-header">
        <span className="sparkline-title">Players Online (last hour)</span>
        <span className="sparkline-current">{currentCount ?? 0}</span>
      </div>
      <svg
        className="sparkline-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <polygon
          points={polyPoints}
          fill="rgba(201,162,39,0.1)"
          stroke="none"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
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

  if (loading) {
    return (
      <div className="page">
        <div className="loading-text">Loading overview…</div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const servers = overview?.servers ?? {};
  const players = overview?.players ?? {};
  const tickets = overview?.tickets ?? {};
  const bans = overview?.bans ?? {};
  const system = overview?.system ?? {};
  const playerHistory = overview?.playerHistory ?? [];
  const motd    = overview?.motd ?? '';
  const version = overview?.version ?? null;

  return (
    <div className="page">
      <h2 className="page-title">Dashboard Overview</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="home-grid">
        <ServerOverviewCard
          name="worldserver"
          displayName="World Server"
          info={servers.worldserver}
        />
        <ServerOverviewCard
          name="authserver"
          displayName="Auth Server"
          info={servers.authserver}
        />
      </div>

      <div className="home-metrics-row">
        <StatCard label="Players Online" value={players.current ?? 0} />
        <StatCard label="Open Tickets" value={tickets.open ?? 0} />
        <StatCard label="Active Bans" value={bans.active ?? 0} />
      </div>

      {system.totalMem > 0 && (
        <MemoryBar totalMem={system.totalMem} freeMem={system.freeMem} />
      )}

      <Sparkline
        playerHistory={playerHistory}
        currentCount={players.current ?? 0}
      />

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
                <span className="overview-version-value">{version.core_revision}</span>
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

      {motd && (
        <div className="motd-current" style={{ marginBottom: 0 }}>
          <span className="motd-current-label">Message of the Day</span>
          <span className="motd-current-value">{motd}</span>
        </div>
      )}
    </div>
  );
}
