import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { formatUnixDate as fmt } from '../utils/format.js';

function fmtRemaining(unix) {
  const secs = Math.max(0, unix - Math.floor(Date.now() / 1000));
  if (secs === 0) return 'Expired';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Mute modal ────────────────────────────────────────────────────────────────
const MUTE_PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '1 day',  minutes: 1440 },
  { label: '7 days', minutes: 10080 },
];

function MuteModal({ onConfirm, onClose }) {
  const [charName, setCharName] = useState('');
  const [minutes, setMinutes]   = useState(60);
  const [reason, setReason]     = useState('');
  const [busy, setBusy]         = useState(false);
  const valid = charName.trim() && minutes >= 1 && reason.trim();

  const handleMute = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm(charName.trim(), minutes, reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Issue Mute</h3>

        <div className="form-group">
          <label>Character name</label>
          <input type="text" value={charName} onChange={(e) => setCharName(e.target.value)}
            placeholder="Character name" autoFocus />
        </div>

        <div className="form-group">
          <label>Duration</label>
          <div className="restart-presets" style={{ marginBottom: 8 }}>
            {MUTE_PRESETS.map((p) => (
              <button key={p.minutes} type="button"
                className={`btn btn-secondary btn-xs restart-preset ${minutes === p.minutes ? 'active' : ''}`}
                onClick={() => setMinutes(p.minutes)}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min="1" value={minutes} style={{ width: 100 }}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))} />
            <span className="td-muted">minutes</span>
          </div>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for mute" />
        </div>

        <div className="modal-actions">
          <button className="btn btn-warning" onClick={handleMute} disabled={!valid || busy}>
            {busy ? 'Muting…' : 'Mute Player'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Unmute confirmation modal ─────────────────────────────────────────────────
function UnmuteModal({ username, reason, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Unmute <span className="player-name-em">{username}</span>?</h3>
        <p className="modal-detail">Muted for: <em>{reason || '—'}</em></p>
        <div className="modal-actions">
          <button className="btn btn-success" onClick={onConfirm}>Unmute</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MutesPage() {
  const [mutes, setMutes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showMuteModal, setShowMuteModal]   = useState(false);
  const [unmuteTarget, setUnmuteTarget]     = useState(null); // mute row

  const loadMutes = useCallback(async () => {
    try {
      const data = await api.getMutes();
      setMutes(data.mutes);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMutes(); }, [loadMutes]);

  const handleMute = async (charName, minutes, reason) => {
    setShowMuteModal(false);
    try {
      await api.muteCharacter(charName, minutes, reason);
      toast(`${charName} muted for ${minutes} minute(s)`);
      setTimeout(loadMutes, 1500);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleUnmute = async () => {
    const row = unmuteTarget;
    setUnmuteTarget(null);
    try {
      await api.unmute(row.id);
      toast(`${row.username} unmuted`);
      setMutes((prev) => prev.filter((m) => m.id !== row.id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Active Mutes</h2>
          <p className="page-sub">Manage muted accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-warning" onClick={() => setShowMuteModal(true)}>
            Issue Mute
          </button>
          <button className="btn btn-secondary" onClick={loadMutes} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading mutes…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Muted by</th>
                <th>Reason</th>
                <th>Expires</th>
                <th>Remaining</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mutes.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">No active mutes</td></tr>
              ) : mutes.map((m) => (
                <tr key={m.id}>
                  <td className="td-name">{m.username}</td>
                  <td className="td-muted">{m.muteby || '—'}</td>
                  <td>{m.mutereason || '—'}</td>
                  <td className="td-muted">{fmt(m.mutetime)}</td>
                  <td className="td-muted">{fmtRemaining(m.mutetime)}</td>
                  <td>
                    <button className="btn btn-success btn-xs"
                      onClick={() => setUnmuteTarget(m)}>
                      Unmute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showMuteModal && (
        <MuteModal onConfirm={handleMute} onClose={() => setShowMuteModal(false)} />
      )}

      {unmuteTarget && (
        <UnmuteModal
          username={unmuteTarget.username}
          reason={unmuteTarget.mutereason}
          onConfirm={handleUnmute}
          onClose={() => setUnmuteTarget(null)}
        />
      )}
    </div>
  );
}
