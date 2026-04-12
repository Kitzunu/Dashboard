import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_RACES, FALLBACK_CLASSES } from '../constants.js';
import { useAuth } from '../App.jsx';
import { useServerStatus } from '../context/ServerContext.jsx';
import RealmSelector from './RealmSelector.jsx';

function KickModal({ name, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Kick <span className="player-name-em">{name}</span></h3>
        <div className="form-group">
          <label>Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason…"
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-warning" onClick={() => onConfirm(reason)}>Kick</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function BanModal({ player, onConfirm, onClose }) {
  const [type, setType]         = useState('character');
  const [duration, setDuration] = useState('1d');
  const [reason, setReason]     = useState('');

  // The actual target value for each ban type
  const targets = {
    character: player.name,
    account:   player.username || '',
    ip:        player.last_ip  || '',
  };

  const valid = reason.trim() && targets[type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ban <span className="player-name-em">{player.name}</span></h3>

        <div className="form-group">
          <label>Ban type</label>
          <div className="ban-type-tabs">
            {['character', 'account', 'ip'].map((t) => (
              <button
                key={t}
                type="button"
                className={`ban-type-tab ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Target</label>
          <input type="text" value={targets[type] || '—'} readOnly className="input-readonly" />
          {!targets[type] && (
            <small className="text-warn">No {type} info available for this player</small>
          )}
        </div>

        <div className="form-group">
          <label>Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 1h, 1d, 7d, 30d, -1 for permanent"
          />
          <small>Examples: 1h, 1d, 7d, 30d, -1 for permanent</small>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for ban"
            autoFocus
          />
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(type, targets[type], duration.trim(), reason.trim())}
            disabled={!valid}
          >
            Ban
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function PlayersPage({ onViewCharacter }) {
  const { auth } = useAuth();
  const { serverStatus, selectedRealmId } = useServerStatus();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kickTarget, setKickTarget] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [filter, setFilter] = useState('');
  const [races, setRaces]   = useState(FALLBACK_RACES);
  const [classes, setClasses] = useState(FALLBACK_CLASSES);

  const canModerate = auth.gmlevel >= 2;
  const worldOnline = serverStatus?.worldserver?.running ?? true;

  useEffect(() => {
    api.getDBCRaces().then(({ races: r }) => {
      if (r && Object.keys(r).length > 0) setRaces(r);
    }).catch(() => {});
    api.getDBCClasses().then(({ classes: c }) => {
      if (c && Object.keys(c).length > 0) setClasses(c);
    }).catch(() => {});
  }, []);

  const loadPlayers = useCallback(async () => {
    try {
      const data = await api.getPlayers(selectedRealmId);
      setPlayers(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRealmId]);

  useEffect(() => {
    if (!worldOnline) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    loadPlayers();
    const interval = setInterval(loadPlayers, 30000);
    return () => clearInterval(interval);
  }, [worldOnline, loadPlayers]);

  const handleKick = async (reason) => {
    try {
      await api.kickPlayer(kickTarget, reason);
      toast(`Kicked ${kickTarget}`);
      setKickTarget(null);
      setTimeout(loadPlayers, 1500);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleBan = async (type, target, duration, reason) => {
    try {
      await api.banPlayer(banTarget.name, duration, reason, type, target);
      toast(`${type.charAt(0).toUpperCase() + type.slice(1)} ban issued: "${target}" for ${duration}`);
      setBanTarget(null);
      setTimeout(loadPlayers, 1500);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const q = filter.trim().toLowerCase();
  const visible = q
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.username ?? p.account ?? '').toString().toLowerCase().includes(q)
      )
    : players;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Online Players</h2>
          <p className="page-sub">Auto-refreshes every 30 seconds</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RealmSelector />
          <button className="btn btn-secondary" onClick={loadPlayers} disabled={!worldOnline}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!worldOnline ? (
        <div className="offline-notice">World Server is offline</div>
      ) : (
        <>
          <div className="filter-row">
            <input
              className="filter-input"
              type="text"
              placeholder="Filter by name or account…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')}>Clear</button>
            )}
          </div>

          {loading ? (
            <div className="loading-text">Loading players…</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Race</th>
                    <th>Class</th>
                    <th>Level</th>
                    <th>Zone</th>
                    <th>Account</th>
                    {canModerate && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={canModerate ? 7 : 6} className="empty-cell">
                        {q ? 'No players match that filter' : 'No players online'}
                      </td>
                    </tr>
                  ) : (
                    visible.map((p) => (
                      <tr key={p.guid}>
                        <td className="td-name">
                          {onViewCharacter ? (
                            <button
                              className="btn-link"
                              onClick={() => onViewCharacter(p.guid)}
                            >
                              {p.name}
                            </button>
                          ) : p.name}
                        </td>
                        <td>{races[p.race] ?? p.race}</td>
                        <td>{classes[p.class] ?? p.class}</td>
                        <td>{p.level}</td>
                        <td className="td-muted">{p.zoneName ?? p.zone}</td>
                        <td className="td-muted">{p.username ?? p.account}</td>
                        {canModerate && (
                          <td className="td-actions">
                            <button
                              className="btn btn-warning btn-xs"
                              onClick={() => setKickTarget(p.name)}
                            >
                              Kick
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => setBanTarget(p)}
                            >
                              Ban
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {kickTarget && (
        <KickModal
          name={kickTarget}
          onConfirm={handleKick}
          onClose={() => setKickTarget(null)}
        />
      )}
      {banTarget && (
        <BanModal
          player={banTarget}
          onConfirm={handleBan}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  );
}
