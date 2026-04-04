import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const METRIC_TYPES = [
  { value: 'player_count', label: 'Player Count' },
  { value: 'cpu',          label: 'CPU Usage (%)' },
  { value: 'memory',       label: 'Memory Usage (%)' },
];

const RESOLUTIONS = [
  { value: 'raw',    label: 'Raw' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily',  label: 'Daily' },
];

const PRESETS = [
  { label: '24h', days: 1 },
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
];

function formatDate(val) {
  if (!val) return '';
  return new Date(val).toLocaleString();
}

function SimpleChart({ data, label, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(122, 133, 160, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(122, 133, 160, 0.6)';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const val = maxVal - (range * i) / 4;
      ctx.fillText(Math.round(val), padding.left - 8, y + 4);
    }

    // Data line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * plotW;
      const y = padding.top + plotH - ((d.value - minVal) / range) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    const lastX = padding.left + plotW;
    const baseY = padding.top + plotH;
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(padding.left, baseY);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    ctx.fill();

    // X-axis labels
    ctx.fillStyle = 'rgba(122, 133, 160, 0.6)';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(6, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1 || 1)) * (data.length - 1));
      const x = padding.left + (idx / (data.length - 1 || 1)) * plotW;
      const d = new Date(data[idx].recorded_at);
      const HOURLY_LABEL_THRESHOLD = 48;
      const lbl = data.length > HOURLY_LABEL_THRESHOLD
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(lbl, x, h - 8);
    }
  }, [data, color]);

  if (!data.length) {
    return (
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        No data for this period
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: 250, display: 'block' }} />
  );
}

export default function AnalyticsPage() {
  const [metricType, setMetricType] = useState('player_count');
  const [resolution, setResolution] = useState('hourly');
  const [dateRange, setDateRange] = useState(1);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - dateRange * 86400000).toISOString();
      const [chartData, summaryData] = await Promise.all([
        api.getAnalytics(metricType, from, to, resolution),
        api.getAnalyticsSummary(),
      ]);
      setData(chartData.data || []);
      setSummary(summaryData);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [metricType, resolution, dateRange]);

  useEffect(() => { load(); }, [load]);

  const chartColor = metricType === 'player_count' ? 'rgb(93, 155, 213)'
    : metricType === 'cpu' ? 'rgb(232, 168, 56)'
    : 'rgb(61, 220, 132)';

  const metricLabel = METRIC_TYPES.find((m) => m.value === metricType)?.label || metricType;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Historical Analytics</h2>
          <p className="page-sub">Long-term trends and statistics</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="home-metrics-row" style={{ marginBottom: 24 }}>
          <div className="metric-card">
            <div className="stat-label">Peak (24h)</div>
            <div className="stat-value">{Math.round(summary.peakPlayers.last24h)}</div>
            <div className="stat-sub">players</div>
          </div>
          <div className="metric-card">
            <div className="stat-label">Peak (7d)</div>
            <div className="stat-value">{Math.round(summary.peakPlayers.last7d)}</div>
            <div className="stat-sub">players</div>
          </div>
          <div className="metric-card">
            <div className="stat-label">Peak (30d)</div>
            <div className="stat-value">{Math.round(summary.peakPlayers.last30d)}</div>
            <div className="stat-sub">players</div>
          </div>
          <div className="metric-card">
            <div className="stat-label">Avg CPU (24h)</div>
            <div className="stat-value">{summary.averages.cpu}%</div>
            <div className="stat-sub">usage</div>
          </div>
          <div className="metric-card">
            <div className="stat-label">Avg Memory (24h)</div>
            <div className="stat-value">{summary.averages.memory}%</div>
            <div className="stat-sub">usage</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="filter-row" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="ban-type-tabs">
          {METRIC_TYPES.map((m) => (
            <button key={m.value}
              className={`ban-type-tab ${metricType === m.value ? 'active' : ''}`}
              onClick={() => setMetricType(m.value)}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {PRESETS.map((p) => (
            <button key={p.days}
              className={`btn btn-xs ${dateRange === p.days ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange(p.days)}>
              {p.label}
            </button>
          ))}
        </div>

        <select className="filter-input" value={resolution} onChange={(e) => setResolution(e.target.value)}
          style={{ width: 130 }}>
          {RESOLUTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
        <h3 style={{ marginBottom: 8 }}>{metricLabel}</h3>
        <span className="td-muted" style={{ fontSize: 12 }}>
          {data.length} data points · Last {dateRange} day{dateRange > 1 ? 's' : ''} · {resolution} resolution
        </span>
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              Loading…
            </div>
          ) : (
            <SimpleChart data={data} label={metricLabel} color={chartColor} />
          )}
        </div>
      </div>
    </div>
  );
}
