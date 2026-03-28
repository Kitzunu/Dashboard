import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const RACES = {
  1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead',
  6: 'Tauren', 7: 'Gnome', 8: 'Troll', 10: 'Blood Elf', 11: 'Draenei',
};
const CLASSES = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
  6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid',
};

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

function BanModal({ name, onConfirm, onClose }) {
  const [duration, setDuration] = useState('1d');
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ban <span className="player-name-em">{name}</span></h3>
        <div className="form-group">
          <label>Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 1d, 7d, 1m, -1 (permanent)"
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
            onClick={() => onConfirm(duration, reason)}
            disabled={!reason.trim()}
          >
            Ban
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function PlayersPage({ auth }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [kickTarget, setKickTarget] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [filter, setFilter] = useState('');

  const canModerate = auth.gmlevel >= 2;

  const showFlash = (text, isError = false) => {
    setFlash({ text, error: isError });
    setTimeout(() => setFlash(null), 4000);
  };

  const loadPlayers = useCallback(async () => {
    try {
      const data = await api.getPlayers();
      setPlayers(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 30000);
    return () => clearInterval(interval);
  }, [loadPlayers]);

  const handleKick = async (reason) => {
    try {
      await api.kickPlayer(kickTarget, reason);
      showFlash(`Kicked ${kickTarget}`);
      setKickTarget(null);
      setTimeout(loadPlayers, 1500);
    } catch (err) {
      showFlash(err.message, true);
    }
  };

  const handleBan = async (duration, reason) => {
    try {
      await api.banPlayer(banTarget, duration, reason);
      showFlash(`Banned ${banTarget} for ${duration}`);
      setBanTarget(null);
      setTimeout(loadPlayers, 1500);
    } catch (err) {
      showFlash(err.message, true);
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
        <button className="btn btn-secondary" onClick={loadPlayers}>Refresh</button>
      </div>

      {flash && (
        <div className={`alert ${flash.error ? 'alert-error' : 'alert-info'}`}>{flash.text}</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

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
                <th>Account</th>
                {canModerate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={canModerate ? 6 : 5} className="empty-cell">
                    {q ? 'No players match that filter' : 'No players online'}
                  </td>
                </tr>
              ) : (
                visible.map((p) => (
                  <tr key={p.guid}>
                    <td className="td-name">{p.name}</td>
                    <td>{RACES[p.race] ?? p.race}</td>
                    <td>{CLASSES[p.class] ?? p.class}</td>
                    <td>{p.level}</td>
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
                          onClick={() => setBanTarget(p.name)}
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

      {kickTarget && (
        <KickModal
          name={kickTarget}
          onConfirm={handleKick}
          onClose={() => setKickTarget(null)}
        />
      )}
      {banTarget && (
        <BanModal
          name={banTarget}
          onConfirm={handleBan}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  );
}
