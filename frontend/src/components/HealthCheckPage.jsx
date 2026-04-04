import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StatusBadge({ status }) {
  const cls = status === 'ok' ? 'badge badge-green' : 'badge badge-red';
  return <span className={cls}>{status}</span>;
}

export default function HealthCheckPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.getHealthCheck();
      setData(result);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  if (loading) return <div className="page"><div className="loading-text">Loading health check…</div></div>;
  if (!data) return <div className="page"><div className="alert alert-error">Failed to load health check data.</div></div>;

  const mem = data.system?.memoryUsage || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Health Check</h2>
          <p className="page-sub">System health and connection status</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Database Pools */}
      <h3 style={{ marginBottom: 12 }}>Database Pools</h3>
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Pool</th>
              <th>Status</th>
              <th>Latency</th>
              <th title="Idle connections available in the pool">Free</th>
              <th title="Connections currently executing queries">Active</th>
              <th title="Total connections in the pool (Free + Active)">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.database.map((db, i) => {
              const conn = data.connections[i] || {};
              return (
                <tr key={db.name}>
                  <td className="td-name">{db.name}</td>
                  <td><StatusBadge status={db.status} /></td>
                  <td className="td-muted">{db.latencyMs} ms</td>
                  <td className="td-muted">{conn.free ?? '—'}</td>
                  <td className="td-muted">{conn.active ?? '—'}</td>
                  <td className="td-muted">{conn.total ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* System Info */}
      <h3 style={{ marginBottom: 12 }}>System</h3>
      <div className="account-detail-grid" style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Node.js</label>
          <span className="td-muted">{data.system.nodeVersion}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Uptime</label>
          <span className="td-muted">{formatUptime(data.system.uptime)}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>PID</label>
          <span className="td-muted mono">{data.system.pid}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Platform</label>
          <span className="td-muted">{data.system.platform}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>CPU Cores</label>
          <span className="td-muted">{data.system.cpuCount}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Heap Used</label>
          <span className="td-muted">{formatBytes(mem.heapUsed)}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Heap Total</label>
          <span className="td-muted">{formatBytes(mem.heapTotal)}</span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>RSS</label>
          <span className="td-muted">{formatBytes(mem.rss)}</span>
        </div>
      </div>

      {/* Agent & Bridge */}
      <h3 style={{ marginBottom: 12 }}>Services</h3>
      <div className="account-detail-grid" style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Server Bridge</label>
          <StatusBadge status={data.serverBridge.connected ? 'ok' : 'error'} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Agent</label>
          <StatusBadge status={data.agent.error ? 'error' : 'ok'} />
        </div>
        {data.agent.uptime != null && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Agent Uptime</label>
            <span className="td-muted">{formatUptime(data.agent.uptime)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
