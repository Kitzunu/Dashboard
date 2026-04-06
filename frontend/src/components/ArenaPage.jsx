import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_CLASSES, FALLBACK_RACES } from '../constants.js';
import { useAuth } from '../App.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRACKET_LABELS = { 2: '2v2', 3: '3v3', 5: '5v5' };

function bracketLabel(type) {
  return BRACKET_LABELS[type] ?? `${type}v${type}`;
}

function winRate(wins, games) {
  if (!games) return '—';
  return `${((wins / games) * 100).toFixed(1)}%`;
}

// ── Edit team modal ───────────────────────────────────────────────────────────

function EditTeamModal({ team, onSave, onClose }) {
  const [rating, setRating]         = useState(team.rating);
  const [captainGuid, setCaptainGuid] = useState(team.captainGuid);
  const [saving, setSaving]         = useState(false);

  const valid = rating >= 0 && captainGuid > 0;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const data = {};
      if (parseInt(rating, 10) !== team.rating) data.rating = parseInt(rating, 10);
      if (parseInt(captainGuid, 10) !== team.captainGuid) data.captainGuid = parseInt(captainGuid, 10);
      if (Object.keys(data).length === 0) { onClose(); return; }
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Team: {team.name}</h3>

        <div className="form-group">
          <label>Team Rating</label>
          <input
            type="number"
            min={0}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Captain</label>
          <select value={captainGuid} onChange={(e) => setCaptainGuid(parseInt(e.target.value, 10))}>
            {team.members.map((m) => (
              <option key={m.guid} value={m.guid}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete team modal ─────────────────────────────────────────────────────────

function DeleteTeamModal({ team, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete arena team?</h3>
        <p className="modal-detail td-muted">
          <strong>{team.name}</strong> ({bracketLabel(team.type)}) — Rating: {team.rating}
        </p>
        <p className="td-muted" style={{ fontSize: 13 }}>
          This will permanently remove the team and all its members. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Confirm Delete'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Create team modal ─────────────────────────────────────────────────────────

function CreateTeamModal({ onSave, onClose }) {
  const [name, setName]               = useState('');
  const [type, setType]               = useState('2');
  const [captainSearch, setCaptainSearch] = useState('');
  const [captainResults, setCaptainResults] = useState([]);
  const [captainGuid, setCaptainGuid] = useState(null);
  const [captainName, setCaptainName] = useState('');
  const [searching, setSearching]     = useState(false);
  const [saving, setSaving]           = useState(false);

  const valid = name.trim().length >= 2 && name.trim().length <= 24 && captainGuid > 0;

  const handleSearch = async () => {
    if (!captainSearch.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchCharacters(captainSearch.trim());
      setCaptainResults(Array.isArray(results) ? results : []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type: parseInt(type, 10), captainGuid });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Arena Team</h3>

        <div className="form-group">
          <label>Team Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name…"
            maxLength={24}
            autoFocus
          />
          <small>2–24 characters</small>
        </div>

        <div className="form-group">
          <label>Bracket</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="2">2v2</option>
            <option value="3">3v3</option>
            <option value="5">5v5</option>
          </select>
        </div>

        <div className="form-group">
          <label>Captain</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={captainSearch}
              onChange={(e) => setCaptainSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search character name…"
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleSearch} disabled={searching}>
              {searching ? '…' : 'Search'}
            </button>
          </div>
          {captainGuid && (
            <div className="td-muted" style={{ marginTop: 4, fontSize: 13 }}>
              Selected: <strong>{captainName}</strong> (GUID: {captainGuid})
            </div>
          )}
          {captainResults.length > 0 && (
            <div className="table-wrap" style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Class</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {captainResults.map((c) => (
                    <tr key={c.guid} className={captainGuid === c.guid ? 'row-selected' : ''}>
                      <td className="td-name">{c.name}</td>
                      <td>{c.level}</td>
                      <td className="td-muted">{FALLBACK_CLASSES[c.class] ?? c.class}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => { setCaptainGuid(c.guid); setCaptainName(c.name); }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'Creating…' : 'Create Team'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ members, team, auth, onViewCharacter, onRemoveMember }) {
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
            {auth.gmlevel >= 2 && <th style={{ width: 80 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.guid}>
              <td className="td-name">
                {onViewCharacter
                  ? <button className="btn-link" onClick={() => onViewCharacter(m.guid)}>{m.name}</button>
                  : m.name}
                {m.guid === team.captainGuid && (
                  <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: 10 }}>Captain</span>
                )}
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
              {auth.gmlevel >= 2 && (
                <td>
                  {m.guid !== team.captainGuid && (
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={() => onRemoveMember(m.guid, m.name)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
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

// ── Match History tab ─────────────────────────────────────────────────────────

function MatchHistoryTab({ arenaTeamId }) {
  const [matches, setMatches]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getArenaMatches(arenaTeamId)
      .then((data) => setMatches(data))
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [arenaTeamId]);

  if (loading) return <div className="empty-state">Loading match data…</div>;
  if (matches.length === 0) return <div className="empty-state">No match history available.</div>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Class</th>
            <th style={{ textAlign: 'center' }}>MMR</th>
            <th style={{ textAlign: 'center' }}>Max MMR</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.guid}>
              <td className="td-name">{m.charName}</td>
              <td className="td-muted">{FALLBACK_CLASSES[m.class] ?? m.class}</td>
              <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.matchMakerRating}</td>
              <td style={{ textAlign: 'center' }} className="td-muted">{m.maxMMR}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['Members', 'Stats', 'Match History'];

export default function ArenaPage({ onViewCharacter }) {
  const { auth } = useAuth();
  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [bracketFilter, setBracketFilter] = useState('all');
  const [selected, setSelected]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]       = useState('Members');
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);

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

  const handleCreateTeam = async (data) => {
    try {
      const result = await api.createArenaTeam(data);
      toast('Arena team created', 'success');
      setShowCreate(false);
      await load();
      if (result.arenaTeamId) await openDetail(result.arenaTeamId);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleEditTeam = async (data) => {
    try {
      await api.updateArenaTeam(selected.arenaTeamId, data);
      toast('Arena team updated', 'success');
      setEditTarget(null);
      await openDetail(selected.arenaTeamId);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await api.deleteArenaTeam(deleteTarget.arenaTeamId);
      toast(`Arena team "${deleteTarget.name}" deleted`, 'success');
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRemoveMember = async (guid, name) => {
    if (!confirm(`Remove ${name} from this arena team?`)) return;
    try {
      await api.removeArenaMember(selected.arenaTeamId, guid);
      toast(`${name} removed from team`, 'success');
      await openDetail(selected.arenaTeamId);
      await load();
    } catch (err) {
      toast(err.message, 'error');
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
        <div style={{ display: 'flex', gap: 8 }}>
          {auth.gmlevel >= 3 && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create Team</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
        </div>
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
                {auth.gmlevel >= 3 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(selected)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selected)}>
                      Delete
                    </button>
                  </div>
                )}
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

              {activeTab === 'Members'       && <MembersTab members={selected.members} team={selected} auth={auth} onViewCharacter={onViewCharacter} onRemoveMember={handleRemoveMember} />}
              {activeTab === 'Stats'         && <StatsTab   team={selected} />}
              {activeTab === 'Match History' && <MatchHistoryTab arenaTeamId={selected.arenaTeamId} />}
            </>
          )}
        </div>
      </div>

      {/* Create team modal */}
      {showCreate && (
        <CreateTeamModal
          onSave={handleCreateTeam}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit team modal */}
      {editTarget && (
        <EditTeamModal
          team={editTarget}
          onSave={handleEditTeam}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete team modal */}
      {deleteTarget && (
        <DeleteTeamModal
          team={deleteTarget}
          onConfirm={handleDeleteTeam}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
