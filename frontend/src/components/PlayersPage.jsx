import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const RACES = {
  1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead',
  6: 'Tauren', 7: 'Gnome', 8: 'Troll', 10: 'Blood Elf', 11: 'Draenei',
};
const CLASSES = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
  6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid',
};
const ZONES = {
  // Cities
  1519: 'Stormwind City', 1537: 'Ironforge', 1497: 'Undercity',
  1637: 'Orgrimmar', 1638: 'Thunder Bluff', 1657: 'Darnassus',
  3487: 'Silvermoon City', 4197: 'Dalaran', 3703: 'Shattrath City',
  // Eastern Kingdoms
  1: 'Dun Morogh', 12: 'Elwynn Forest', 38: 'Loch Modan', 40: 'Westfall',
  44: 'Redridge Mountains', 10: 'Duskwood', 47: 'Burning Steppes',
  51: 'Searing Gorge', 3: 'Badlands', 25: 'Blackrock Mountain',
  85: 'Tirisfal Glades', 130: 'Silverpine Forest', 267: 'Hillsbrad Foothills',
  15: 'Alterac Mountains', 17: 'Arathi Highlands', 11: 'Wetlands',
  28: 'Western Plaguelands', 139: 'Eastern Plaguelands', 22: 'Stranglethorn Vale',
  14: 'Dustwallow Marsh', 8: 'Swamp of Sorrows', 4: 'Blasted Lands',
  26: 'Deadwind Pass', 4080: "Isle of Quel'Danas",
  // Kalimdor
  141: 'Teldrassil', 148: 'Darkshore', 331: 'Ashenvale',
  406: 'Stonetalon Mountains', 405: 'Desolace', 215: 'Mulgore',
  16: 'Azshara', 357: 'Feralas', 400: 'Thousand Needles',
  440: 'Tanaris', 490: "Un'Goro Crater", 361: 'Felwood',
  371: 'Winterspring', 493: 'Moonglade', 1377: 'Silithus',
  // Outland
  3483: 'Hellfire Peninsula', 3521: 'Zangarmarsh', 3519: 'Terokkar Forest',
  3518: 'Nagrand', 3522: "Blade's Edge Mountains", 3523: 'Shadowmoon Valley',
  3524: 'Netherstorm', 3430: 'Eversong Woods', 3433: 'Ghostlands',
  // Northrend
  3537: 'Borean Tundra', 495: 'Howling Fjord', 65: 'Dragonblight',
  394: 'Grizzly Hills', 66: "Zul'Drak", 67: 'Crystalsong Forest',
  4197: 'Dalaran', 2817: 'Icecrown', 4275: 'Storm Peaks',
  // Battlegrounds / instances
  618: 'Wintergrasp', 2597: 'Alterac Valley', 3277: 'Warsong Gulch',
  3358: 'Arathi Basin', 3820: 'Eye of the Storm', 4710: 'Isle of Conquest',
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

export default function PlayersPage({ auth, serverStatus }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kickTarget, setKickTarget] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [filter, setFilter] = useState('');

  const canModerate = auth.gmlevel >= 2;
  const worldOnline = serverStatus?.worldserver?.running ?? true;

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

  const handleBan = async (duration, reason) => {
    try {
      await api.banPlayer(banTarget, duration, reason);
      toast(`Banned ${banTarget} for ${duration}`);
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
        <button className="btn btn-secondary" onClick={loadPlayers} disabled={!worldOnline}>
          Refresh
        </button>
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
                        <td className="td-name">{p.name}</td>
                        <td>{RACES[p.race] ?? p.race}</td>
                        <td>{CLASSES[p.class] ?? p.class}</td>
                        <td>{p.level}</td>
                        <td className="td-muted">{ZONES[p.zone] ?? p.zone}</td>
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
          name={banTarget}
          onConfirm={handleBan}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  );
}
