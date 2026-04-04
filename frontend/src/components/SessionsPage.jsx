import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { GM_LABELS } from '../constants.js';

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString();
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateUA(ua) {
  if (!ua) return '—';
  if (ua.length > 60) return ua.slice(0, 60) + '…';
  return ua;
}

export default function SessionsPage({ auth }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async () => {
    const s = revokeTarget;
    setRevokeTarget(null);
    try {
      await api.revokeSession(s.id);
      setSessions((prev) => prev.filter((x) => x.id !== s.id));
      toast('Session revoked');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleRevokeAll = async () => {
    setConfirmRevokeAll(false);
    try {
      // Get token hash from current token
      const stored = localStorage.getItem('ac_auth');
      const token = stored ? JSON.parse(stored).token : '';
      // Generate sha256 hash of current token client-side
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const result = await api.revokeAllSessions(hashHex);
      toast(`Revoked ${result.revoked || 'all other'} sessions`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Active Sessions</h2>
          <p className="page-sub">View and manage active dashboard sessions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmRevokeAll(true)}>
            Revoke All Others
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="alert" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
          No active sessions found.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>GM Level</th>
                <th>IP</th>
                <th>Browser</th>
                <th>Login</th>
                <th>Last Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="td-name">
                    {s.username}
                    {s.username === auth?.username && (
                      <span className="badge badge-green" style={{ marginLeft: 6 }}>You</span>
                    )}
                  </td>
                  <td className="td-muted">{GM_LABELS[s.gmlevel] || `Level ${s.gmlevel}`}</td>
                  <td className="td-muted mono" style={{ fontSize: 12 }}>{s.ip}</td>
                  <td className="td-muted" style={{ fontSize: 12, maxWidth: 200 }} title={s.user_agent}>
                    {truncateUA(s.user_agent)}
                  </td>
                  <td className="td-muted">{formatDate(s.created_at)}</td>
                  <td className="td-muted">{timeAgo(s.last_active)}</td>
                  <td>
                    <button className="btn btn-danger btn-xs"
                      onClick={() => setRevokeTarget(s)}
                      disabled={s.username === auth?.username}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget && (
        <div className="modal-overlay" onClick={() => setRevokeTarget(null)}>
          <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Revoke Session</h3></div>
            <div className="modal-body">
              <p>Revoke the session for <strong>{revokeTarget.username}</strong> (IP: {revokeTarget.ip})?</p>
              <p className="td-muted" style={{ fontSize: 13 }}>They will be logged out on their next request.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleRevoke}>Revoke</button>
              <button className="btn btn-ghost" onClick={() => setRevokeTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmRevokeAll && (
        <div className="modal-overlay" onClick={() => setConfirmRevokeAll(false)}>
          <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Revoke All Sessions</h3></div>
            <div className="modal-body">
              <p>This will revoke <strong>all sessions except yours</strong>. All other users will be logged out.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleRevokeAll}>Revoke All</button>
              <button className="btn btn-ghost" onClick={() => setConfirmRevokeAll(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
