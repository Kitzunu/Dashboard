import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const OPERATIONS = [
  { id: 'kick', label: 'Batch Kick', minFields: ['names', 'reason'] },
  { id: 'ban', label: 'Batch Ban', minFields: ['targets', 'duration', 'reason'] },
  { id: 'mail', label: 'Batch Mail', minFields: ['recipients', 'subject'] },
  { id: 'gmlevel', label: 'Batch GM Level', minFields: ['accountIds', 'gmlevel'] },
];

/* ── Inline search picker ──────────────────────────────────────── */
function SearchPicker({ searchType, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      if (searchType === 'character') {
        const rows = await api.searchCharacters(q);
        setResults(rows.map((r) => ({ label: r.name, sub: `Lvl ${r.level}`, value: r.name })));
      } else {
        const data = await api.searchAccounts(q);
        setResults((data.rows || []).map((r) => ({ label: r.username, sub: `#${r.id}`, value: searchType === 'accountId' ? String(r.id) : r.username })));
      }
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSelect = (item) => {
    onAdd(item.value);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const placeholder = searchType === 'character'
    ? 'Search characters to add…'
    : searchType === 'accountId'
      ? 'Search accounts to add…'
      : 'Search accounts to add…';

  return (
    <div className="batch-search-picker" ref={wrapRef}>
      <input type="text" value={query} onChange={handleChange}
        onFocus={() => { if (results.length) setOpen(true); }}
        placeholder={placeholder}
        className="batch-search-input" />
      {open && results.length > 0 && (
        <div className="batch-search-dropdown">
          {results.slice(0, 15).map((item, i) => (
            <div key={i} className="batch-search-option" onClick={() => handleSelect(item)}>
              <span className="td-name">{item.label}</span>
              <span className="td-muted">{item.sub}</span>
            </div>
          ))}
        </div>
      )}
      {open && loading && (
        <div className="batch-search-dropdown">
          <div style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: 13 }}>Searching…</div>
        </div>
      )}
    </div>
  );
}

function ResultsModal({ results, onClose }) {
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Batch Results</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <span className="badge badge-green">{succeeded} succeeded</span>
          {failed > 0 && <span className="badge badge-red">{failed} failed</span>}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Result</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td className="td-name">{String(r.target)}</td>
                  <td>
                    <span className={`badge ${r.success ? 'badge-green' : 'badge-red'}`}>
                      {r.success ? 'OK' : 'Failed'}
                    </span>
                  </td>
                  <td className="td-muted">{r.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BatchOperationsPage() {
  const [operation, setOperation] = useState('kick');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  // Kick state
  const [kickNames, setKickNames] = useState('');
  const [kickReason, setKickReason] = useState('');

  // Ban state
  const [banTargets, setBanTargets] = useState('');
  const [banType, setBanType] = useState('character');
  const [banDuration, setBanDuration] = useState('1h');
  const [banReason, setBanReason] = useState('');

  // Mail state
  const [mailRecipients, setMailRecipients] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  // GM Level state
  const [gmAccountIds, setGmAccountIds] = useState('');
  const [gmLevel, setGmLevel] = useState(0);

  const parseList = (text) => text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

  const appendToList = (setter) => (value) => {
    setter((prev) => {
      const existing = prev.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (existing.includes(value)) return prev;
      return prev ? `${prev}\n${value}` : value;
    });
  };

  const handleExecute = async () => {
    setBusy(true);
    try {
      let res;
      if (operation === 'kick') {
        const names = parseList(kickNames);
        if (!names.length) { toast('Enter at least one player name', 'error'); return; }
        res = await api.batchKick(names, kickReason);
      } else if (operation === 'ban') {
        const targets = parseList(banTargets).map((t) => ({ type: banType, target: t }));
        if (!targets.length) { toast('Enter at least one target', 'error'); return; }
        if (!banReason) { toast('Reason is required', 'error'); return; }
        res = await api.batchBan(targets, banDuration, banReason);
      } else if (operation === 'mail') {
        const recipients = parseList(mailRecipients);
        if (!recipients.length) { toast('Enter at least one recipient', 'error'); return; }
        if (!mailSubject) { toast('Subject is required', 'error'); return; }
        res = await api.batchMail({ recipients, subject: mailSubject, body: mailBody, type: 'text' });
      } else if (operation === 'gmlevel') {
        const accountIds = parseList(gmAccountIds).map((s) => parseInt(s, 10)).filter((n) => n > 0);
        if (!accountIds.length) { toast('Enter at least one account ID', 'error'); return; }
        res = await api.batchGMLevel(accountIds, gmLevel);
      }
      if (res?.results) {
        setResults(res.results);
        const ok = res.results.filter((r) => r.success).length;
        toast(`Batch complete: ${ok}/${res.results.length} succeeded`);
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Batch Operations</h2>
          <p className="page-sub">Perform bulk actions on multiple players or accounts</p>
        </div>
      </div>

      <div className="batch-operations-card">
        <div className="ban-type-tabs">
          {OPERATIONS.map((op) => (
            <button key={op.id}
              className={`ban-type-tab ${operation === op.id ? 'active' : ''}`}
              onClick={() => setOperation(op.id)}>
              {op.label}
            </button>
          ))}
        </div>

        {operation === 'kick' && (
          <>
            <div className="form-group">
              <label>Player Names (one per line or comma-separated)</label>
              <SearchPicker searchType="character" onAdd={appendToList(setKickNames)} />
              <textarea value={kickNames} onChange={(e) => setKickNames(e.target.value)}
                rows={5} placeholder="PlayerName1&#10;PlayerName2&#10;PlayerName3"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input type="text" value={kickReason} onChange={(e) => setKickReason(e.target.value)}
                placeholder="Reason for kick" />
            </div>
          </>
        )}

        {operation === 'ban' && (
          <>
            <div className="form-group">
              <label>Ban Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['character', 'account', 'ip'].map((t) => (
                  <button key={t}
                    className={`btn btn-xs ${banType === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBanType(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Targets (one per line or comma-separated)</label>
              <SearchPicker searchType={banType === 'ip' ? 'account' : banType === 'account' ? 'account' : 'character'} onAdd={appendToList(setBanTargets)} />
              <textarea value={banTargets} onChange={(e) => setBanTargets(e.target.value)}
                rows={5} placeholder="Target1&#10;Target2&#10;Target3"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label>Duration</label>
              <input type="text" value={banDuration} onChange={(e) => setBanDuration(e.target.value)}
                placeholder="e.g. 1h, 7d, 0 for permanent" style={{ width: 150 }} />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input type="text" value={banReason} onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for ban" />
            </div>
          </>
        )}

        {operation === 'mail' && (
          <>
            <div className="form-group">
              <label>Recipients (one per line or comma-separated)</label>
              <SearchPicker searchType="character" onAdd={appendToList(setMailRecipients)} />
              <textarea value={mailRecipients} onChange={(e) => setMailRecipients(e.target.value)}
                rows={5} placeholder="CharacterName1&#10;CharacterName2"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input type="text" value={mailSubject} onChange={(e) => setMailSubject(e.target.value)}
                placeholder="Mail subject" />
            </div>
            <div className="form-group">
              <label>Body</label>
              <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)}
                rows={3} placeholder="Mail body text" style={{ width: '100%' }} />
            </div>
          </>
        )}

        {operation === 'gmlevel' && (
          <>
            <div className="form-group">
              <label>Account IDs (one per line or comma-separated)</label>
              <SearchPicker searchType="accountId" onAdd={appendToList(setGmAccountIds)} />
              <textarea value={gmAccountIds} onChange={(e) => setGmAccountIds(e.target.value)}
                rows={5} placeholder="1&#10;2&#10;3"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label>GM Level</label>
              <select value={gmLevel} onChange={(e) => setGmLevel(parseInt(e.target.value, 10))} style={{ width: 200 }}>
                <option value={0}>0 — Player</option>
                <option value={1}>1 — Moderator</option>
                <option value={2}>2 — Game Master</option>
                <option value={3}>3 — Administrator</option>
              </select>
            </div>
          </>
        )}

        <div>
          <button className="btn btn-primary" onClick={handleExecute} disabled={busy}>
            {busy ? 'Executing…' : 'Execute'}
          </button>
        </div>
      </div>

      {results && <ResultsModal results={results} onClose={() => setResults(null)} />}
    </div>
  );
}
