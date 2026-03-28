import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function fmt(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString();
}

export default function BansPage() {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null); // ban id pending unban

  const loadBans = useCallback(async () => {
    try {
      const data = await api.getBans();
      setBans(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBans(); }, [loadBans]);

  const handleUnban = async (ban) => {
    try {
      await api.unbanAccount(ban.id);
      toast(`Unbanned ${ban.username}`);
      setConfirming(null);
      setBans((prev) => prev.filter((b) => b.id !== ban.id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const ban = confirming != null ? bans.find((b) => b.id === confirming) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Active Bans</h2>
          <p className="page-sub">Account bans currently enforced</p>
        </div>
        <button className="btn btn-secondary" onClick={loadBans} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading bans…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Banned by</th>
                <th>Reason</th>
                <th>Banned at</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">No active bans</td>
                </tr>
              ) : (
                bans.map((b) => (
                  <tr key={b.id}>
                    <td className="td-name">{b.username}</td>
                    <td className="td-muted">{b.bannedby}</td>
                    <td>{b.banreason}</td>
                    <td className="td-muted">{fmt(b.bandate)}</td>
                    <td className={b.permanent ? 'td-perm' : 'td-muted'}>
                      {b.permanent ? 'Permanent' : fmt(b.unbandate)}
                    </td>
                    <td>
                      <button
                        className="btn btn-success btn-xs"
                        onClick={() => setConfirming(b.id)}
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {ban && (
        <div className="modal-overlay" onClick={() => setConfirming(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Unban <span className="player-name-em">{ban.username}</span>?</h3>
            <p className="modal-detail">
              Banned for: <em>{ban.banreason}</em>
            </p>
            <div className="modal-actions">
              <button className="btn btn-success" onClick={() => handleUnban(ban)}>
                Unban
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
