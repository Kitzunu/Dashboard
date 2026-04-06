import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_CLASSES, FALLBACK_RACES, FALLBACK_BATTLEGROUNDS } from '../constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DESERTER_TYPE_NAMES = {
  0: 'Left BG',
  1: 'Offline Kick',
  2: 'Declined Invite',
  3: 'Invite Expired',
  4: 'Logged Out',
};

function bgName(type, typeName) {
  return typeName || FALLBACK_BATTLEGROUNDS[type] || `BG ${type}`;
}

function factionLabel(faction) {
  if (faction == null) return 'Draw';
  const f = Number(faction);
  if (f === 0) return 'Alliance';
  if (f === 1) return 'Horde';
  return 'Draw';
}

function factionClass(faction) {
  if (faction == null) return 'badge-neutral';
  const f = Number(faction);
  if (f === 0) return 'badge-alliance';
  if (f === 1) return 'badge-horde';
  return 'badge-neutral';
}

function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

// ── Match detail modal ────────────────────────────────────────────────────────

function MatchDetailModal({ matchId, onClose, onViewCharacter }) {
  const [match, setMatch]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getBattlegroundMatch(matchId)
      .then(setMatch)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">Loading match data…</div>
        </div>
      </div>
    );
  }

  if (!match || match.error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">{match?.error || 'Match not found.'}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const alliance = (match.players || []).filter((p) => {
    // Alliance races: Human(1), Dwarf(3), NightElf(4), Gnome(7), Draenei(11)
    return [1, 3, 4, 7, 11].includes(p.race);
  });
  const horde = (match.players || []).filter((p) => {
    // Horde races: Orc(2), Undead(5), Tauren(6), Troll(8), BloodElf(10)
    return [2, 5, 6, 8, 10].includes(p.race);
  });

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>
          {bgName(match.type, match.typeName)} — <span className={`badge ${factionClass(match.winner_faction)}`}>
            {factionLabel(match.winner_faction)}{match.winner_faction != null && Number(match.winner_faction) <= 1 ? ' Win' : ''}
          </span>
        </h3>
        <div className="channels-detail-meta" style={{ marginBottom: 12 }}>
          <span className="td-muted">Bracket: <strong>{match.bracket_id}</strong></span>
          <span className="td-muted">·</span>
          <span className="td-muted">Date: <strong>{new Date(match.date).toLocaleString()}</strong></span>
          <span className="td-muted">·</span>
          <span className="td-muted">Players: <strong>{(match.players || []).length}</strong></span>
        </div>

        {(match.players || []).length === 0 ? (
          <div className="empty-state">No player data recorded for this match.</div>
        ) : (
          <>
            <FactionTable
              label="Alliance"
              players={alliance}
              badgeClass="badge-alliance"
              onViewCharacter={onViewCharacter}
            />
            <FactionTable
              label="Horde"
              players={horde}
              badgeClass="badge-horde"
              onViewCharacter={onViewCharacter}
            />
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FactionTable({ label, players, badgeClass, onViewCharacter }) {
  if (players.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ marginBottom: 6 }}>
        <span className={`badge ${badgeClass}`}>{label}</span>
        <span className="td-muted" style={{ marginLeft: 8, fontSize: 12 }}>{players.length} players</span>
      </h4>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th style={{ textAlign: 'center' }}>KB</th>
              <th style={{ textAlign: 'center' }}>Deaths</th>
              <th style={{ textAlign: 'center' }}>HK</th>
              <th style={{ textAlign: 'right' }}>Damage</th>
              <th style={{ textAlign: 'right' }}>Healing</th>
              <th style={{ textAlign: 'center' }}>Won</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.guid}>
                <td className="td-name">
                  {onViewCharacter
                    ? <button className="btn-link" onClick={() => onViewCharacter(p.guid)}>{p.name || `GUID ${p.guid}`}</button>
                    : (p.name || `GUID ${p.guid}`)}
                </td>
                <td className="td-muted">{FALLBACK_CLASSES[p.class] ?? p.class}</td>
                <td style={{ textAlign: 'center' }}>{p.killingBlows}</td>
                <td style={{ textAlign: 'center' }}>{p.deaths}</td>
                <td style={{ textAlign: 'center' }}>{p.honorableKills}</td>
                <td style={{ textAlign: 'right' }} className="td-muted">{formatNumber(p.damageDone)}</td>
                <td style={{ textAlign: 'right' }} className="td-muted">{formatNumber(p.healingDone)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${p.winner ? 'badge-success' : 'badge-danger'}`}>
                    {p.winner ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ onViewCharacter }) {
  const [data, setData]         = useState({ total: 0, rows: [] });
  const [loading, setLoading]   = useState(true);
  const [notice, setNotice]     = useState('');
  const [offset, setOffset]     = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [bgNameMap, setBgNameMap] = useState({});
  const pageSize = 50;

  // Fetch DBC battleground names for the filter dropdown
  useEffect(() => {
    api.getDBCBattlegrounds()
      .then(({ battlegrounds }) => {
        if (battlegrounds && Object.keys(battlegrounds).length > 0) {
          setBgNameMap(battlegrounds);
        }
      })
      .catch(() => { /* DBC not available, use fallbacks */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts = { limit: pageSize, offset };
      if (typeFilter !== '') opts.type = parseInt(typeFilter, 10);
      const result = await api.getBattlegroundHistory(opts);
      setData({ total: result.total, rows: result.rows || [] });
      if (result.notice) setNotice(result.notice);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [offset, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
          style={{ width: 200, flexShrink: 0 }}
        >
          <option value="">All Battlegrounds</option>
          {Object.entries(
            Object.keys(bgNameMap).length > 0 ? bgNameMap : FALLBACK_BATTLEGROUNDS
          ).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <span className="td-muted" style={{ lineHeight: '32px' }}>
          {data.total} match{data.total !== 1 ? 'es' : ''}
        </span>
      </div>

      {notice && <div className="empty-state">{notice}</div>}

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : data.rows.length === 0 ? (
        <div className="empty-state">No battleground history found.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Battleground</th>
                  <th>Bracket</th>
                  <th>Winner</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="clickable-row"
                    onClick={() => setSelectedMatch(row.id)}
                  >
                    <td className="td-muted">{row.id}</td>
                    <td className="td-name">{bgName(row.type, row.typeName)}</td>
                    <td className="td-muted">{row.bracket_id}</td>
                    <td>
                      <span className={`badge ${factionClass(row.winner_faction)}`}>
                        {factionLabel(row.winner_faction)}
                      </span>
                    </td>
                    <td className="td-muted">{new Date(row.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
              >
                ← Prev
              </button>
              <span className="td-muted" style={{ margin: '0 8px', lineHeight: '28px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(offset + pageSize)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selectedMatch && (
        <MatchDetailModal
          matchId={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onViewCharacter={onViewCharacter}
        />
      )}
    </>
  );
}

// ── Deserters tab ─────────────────────────────────────────────────────────────

function DesertersTab({ auth, onViewCharacter }) {
  const [data, setData]       = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice]   = useState('');
  const [offset, setOffset]   = useState(0);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getBattlegroundDeserters({ limit: pageSize, offset });
      setData({ total: result.total, rows: result.rows || [] });
      if (result.notice) setNotice(result.notice);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (guid, name) => {
    if (!confirm(`Remove all deserter entries for ${name || `GUID ${guid}`}?`)) return;
    try {
      await api.removeBattlegroundDeserter(guid);
      toast(`Deserter entries removed for ${name || `GUID ${guid}`}`, 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <>
      {notice && <div className="empty-state">{notice}</div>}

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : data.rows.length === 0 ? (
        <div className="empty-state">No battleground deserters found.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'center' }}>Level</th>
                  <th>Type</th>
                  <th>Date</th>
                  {auth.gmlevel >= 2 && <th style={{ width: 80 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={`${row.guid}-${idx}`}>
                    <td className="td-name">
                      {onViewCharacter && row.name
                        ? <button className="btn-link" onClick={() => onViewCharacter(row.guid)}>{row.name}</button>
                        : (row.name || `GUID ${row.guid}`)}
                    </td>
                    <td className="td-muted">{FALLBACK_CLASSES[row.class] ?? row.class ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{row.level ?? '—'}</td>
                    <td>
                      <span className="badge badge-neutral">
                        {DESERTER_TYPE_NAMES[row.type] ?? `Type ${row.type}`}
                      </span>
                    </td>
                    <td className="td-muted">{new Date(row.datetime).toLocaleString()}</td>
                    {auth.gmlevel >= 2 && (
                      <td>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => handleRemove(row.guid, row.name)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
              >
                ← Prev
              </button>
              <span className="td-muted" style={{ margin: '0 8px', lineHeight: '28px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(offset + pageSize)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice]   = useState('');

  useEffect(() => {
    setLoading(true);
    api.getBattlegroundStats()
      .then((data) => {
        setStats(data);
        if (data.notice) setNotice(data.notice);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading…</div>;
  if (notice) return <div className="empty-state">{notice}</div>;
  if (!stats) return <div className="empty-state">No statistics available.</div>;

  const winPct = (wins, total) => {
    if (!total) return '—';
    return `${((wins / total) * 100).toFixed(1)}%`;
  };

  return (
    <div>
      {/* Overall summary */}
      <div className="arena-summary" style={{ marginBottom: 16 }}>
        <div className="arena-summary-item">
          <span className="arena-summary-label">Total Matches</span>
          <span className="arena-summary-value">{formatNumber(stats.totalMatches)}</span>
        </div>
        <div className="arena-summary-item">
          <span className="arena-summary-label">Alliance Wins</span>
          <span className="arena-summary-value">
            {formatNumber(stats.allianceWins)}
            <span className="td-muted" style={{ fontSize: 12, marginLeft: 6 }}>
              ({winPct(stats.allianceWins, stats.totalMatches)})
            </span>
          </span>
        </div>
        <div className="arena-summary-item">
          <span className="arena-summary-label">Horde Wins</span>
          <span className="arena-summary-value">
            {formatNumber(stats.hordeWins)}
            <span className="td-muted" style={{ fontSize: 12, marginLeft: 6 }}>
              ({winPct(stats.hordeWins, stats.totalMatches)})
            </span>
          </span>
        </div>
        <div className="arena-summary-item">
          <span className="arena-summary-label">Draws</span>
          <span className="arena-summary-value">
            {formatNumber(stats.draws)}
            <span className="td-muted" style={{ fontSize: 12, marginLeft: 6 }}>
              ({winPct(stats.draws, stats.totalMatches)})
            </span>
          </span>
        </div>
      </div>

      {/* Per-BG breakdown */}
      {(stats.byType || []).length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-dim)' }}>By Battleground</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Battleground</th>
                  <th style={{ textAlign: 'center' }}>Matches</th>
                  <th style={{ textAlign: 'center' }}>Alliance Wins</th>
                  <th style={{ textAlign: 'center' }}>Horde Wins</th>
                  <th style={{ textAlign: 'center' }}>Draws</th>
                  <th style={{ textAlign: 'center' }}>Alliance %</th>
                  <th style={{ textAlign: 'center' }}>Horde %</th>
                </tr>
              </thead>
              <tbody>
                {stats.byType.map((bg) => (
                  <tr key={bg.type}>
                    <td className="td-name">{bgName(bg.type, bg.typeName)}</td>
                    <td style={{ textAlign: 'center' }}>{bg.matches}</td>
                    <td style={{ textAlign: 'center' }}>{bg.allianceWins}</td>
                    <td style={{ textAlign: 'center' }}>{bg.hordeWins}</td>
                    <td style={{ textAlign: 'center' }}>{bg.draws}</td>
                    <td style={{ textAlign: 'center' }} className="td-muted">
                      {winPct(bg.allianceWins, bg.matches)}
                    </td>
                    <td style={{ textAlign: 'center' }} className="td-muted">
                      {winPct(bg.hordeWins, bg.matches)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['History', 'Deserters', 'Stats'];

export default function BattlegroundPage({ auth, onViewCharacter }) {
  const [activeTab, setActiveTab] = useState('History');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Battlegrounds</h1>
      </div>

      <div className="ban-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`ban-tab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'History'   && <HistoryTab onViewCharacter={onViewCharacter} />}
      {activeTab === 'Deserters' && <DesertersTab auth={auth} onViewCharacter={onViewCharacter} />}
      {activeTab === 'Stats'     && <StatsTab />}
    </div>
  );
}
