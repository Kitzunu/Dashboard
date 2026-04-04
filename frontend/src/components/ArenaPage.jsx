import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_CLASSES, FALLBACK_RACES } from '../constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRACKET_LABELS = { 2: '2v2', 3: '3v3', 5: '5v5' };

function bracketLabel(type) {
  return BRACKET_LABELS[type] ?? `${type}v${type}`;
}

function winRate(wins, games) {
  if (!games) return '—';
  return `${((wins / games) * 100).toFixed(1)}%`;
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ members, onViewCharacter }) {
  if (members.length === 0) return <div className="empty-state">No members.</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th style={{ textAlign: 'center' }}>Level</th>
            <th style={{ textAlign: 'center' }}>Rating</th>
            <th style={{ textAlign: 'center' }}>Season</th>
            <th style={{ textAlign: 'center' }}>Week</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.guid}>
              <td className="td-name">
                {onViewCharacter
                  ? <button className="btn-link" onClick={() => onViewCharacter(m.guid)}>{m.name}</button>
                  : m.name}
              </td>
              <td className="td-muted">{FALLBACK_CLASSES[m.class] ?? m.class}</td>
              <td style={{ textAlign: 'center' }}>{m.level}</td>
              <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.personalRating}</td>
              <td style={{ textAlign: 'center' }} className="td-muted">
                {m.seasonWins}W / {m.seasonGames - m.seasonWins}L
                <span className="td-muted" style={{ fontSize: 11, marginLeft: 4 }}>
                  ({winRate(m.seasonWins, m.seasonGames)})
                </span>
              </td>
              <td style={{ textAlign: 'center' }} className="td-muted">
                {m.weekWins}W / {m.weekGames - m.weekWins}L
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab({ team }) {
  const stats = [
    { label: 'Team Rating',   value: team.rating },
    { label: 'Rank',          value: team.rank || '—' },
    { label: 'Season Games',  value: team.seasonGames },
    { label: 'Season Wins',   value: team.seasonWins },
    { label: 'Season Losses', value: team.seasonGames - team.seasonWins },
    { label: 'Season Win %',  value: winRate(team.seasonWins, team.seasonGames) },
    { label: 'Week Games',    value: team.weekGames },
    { label: 'Week Wins',     value: team.weekWins },
    { label: 'Week Losses',   value: team.weekGames - team.weekWins },
    { label: 'Week Win %',    value: winRate(team.weekWins, team.weekGames) },
  ];

  return (
    <div className="arena-stats-list">
      {stats.map((s) => (
        <div key={s.label} className="arena-stat-row">
          <span className="arena-stat-label">{s.label}</span>
          <span className="arena-stat-value">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['Members', 'Stats'];

export default function ArenaPage({ onViewCharacter }) {
  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [bracketFilter, setBracketFilter] = useState('all');
  const [selected, setSelected]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]       = useState('Members');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getArenaTeams();
      setTeams(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (arenaTeamId) => {
    setDetailLoading(true);
    setActiveTab('Members');
    try {
      const data = await api.getArenaTeam(arenaTeamId);
      setSelected(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = teams.filter((t) => {
    if (bracketFilter !== 'all' && t.type !== parseInt(bracketFilter, 10)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      (t.captainName ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Arena Teams</h1>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="channels-layout">
        {/* Team list */}
        <div className="guilds-list-panel">
          <div className="channels-search-bar" style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Search arena teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              className="input"
              value={bracketFilter}
              onChange={(e) => setBracketFilter(e.target.value)}
              style={{ width: 90 }}
            >
              <option value="all">All</option>
              <option value="2">2v2</option>
              <option value="3">3v3</option>
              <option value="5">5v5</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No arena teams found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Bracket</th>
                    <th>Captain</th>
                    <th style={{ textAlign: 'center' }}>Rating</th>
                    <th style={{ textAlign: 'center' }}>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.arenaTeamId}
                      className={`clickable-row ${selected?.arenaTeamId === t.arenaTeamId ? 'row-selected' : ''}`}
                      onClick={() => openDetail(t.arenaTeamId)}
                    >
                      <td className="td-name">{t.name}</td>
                      <td>
                        <span className="badge badge-neutral">{bracketLabel(t.type)}</span>
                      </td>
                      <td className="td-muted">{t.captainName ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.rating}</td>
                      <td style={{ textAlign: 'center' }}>{t.memberCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="channels-detail-panel">
          {detailLoading && <div className="empty-state">Loading…</div>}

          {!detailLoading && !selected && (
            <div className="empty-state">Select an arena team to view details.</div>
          )}

          {!detailLoading && selected && (
            <>
              {/* Header */}
              <div className="channels-detail-header">
                <div>
                  <div className="channels-detail-title">{selected.name}</div>
                  <div className="channels-detail-meta">
                    <span className="td-muted">Captain: <strong>{selected.captainName ?? '—'}</strong></span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">Bracket: <strong>{bracketLabel(selected.type)}</strong></span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">Rating: <strong>{selected.rating}</strong></span>
                    {selected.rank > 0 && (
                      <>
                        <span className="td-muted">·</span>
                        <span className="td-muted">Rank: <strong>#{selected.rank}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Season summary */}
              <div className="arena-summary">
                <div className="arena-summary-item">
                  <span className="arena-summary-label">Season</span>
                  <span className="arena-summary-value">
                    {selected.seasonWins}W / {selected.seasonGames - selected.seasonWins}L
                    <span className="td-muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      ({winRate(selected.seasonWins, selected.seasonGames)})
                    </span>
                  </span>
                </div>
                <div className="arena-summary-item">
                  <span className="arena-summary-label">This Week</span>
                  <span className="arena-summary-value">
                    {selected.weekWins}W / {selected.weekGames - selected.weekWins}L
                    <span className="td-muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      ({winRate(selected.weekWins, selected.weekGames)})
                    </span>
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="guild-tabs">
                {TABS.map((t) => (
                  <button
                    key={t}
                    className={`guild-tab${activeTab === t ? ' guild-tab-active' : ''}`}
                    onClick={() => setActiveTab(t)}
                  >
                    {t}
                    {t === 'Members' && (
                      <span className="guild-tab-count">{selected.members.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'Members' && <MembersTab members={selected.members} onViewCharacter={onViewCharacter} />}
              {activeTab === 'Stats'   && <StatsTab   team={selected} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
