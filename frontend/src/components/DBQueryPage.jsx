import React, { useState } from 'react';
import { api } from '../api.js';

const PRESETS = [
  {
    label: 'Online players',
    db: 'characters',
    query: 'SELECT guid, name, race, `class`, level, zone, account FROM characters WHERE online = 1 ORDER BY name',
  },
  {
    label: 'All accounts',
    db: 'auth',
    query: 'SELECT id, username, email, last_login, last_ip, locked FROM account ORDER BY id LIMIT 100',
  },
  {
    label: 'Account bans',
    db: 'auth',
    query: "SELECT ab.id, a.username, FROM_UNIXTIME(ab.bandate) AS banned_at, FROM_UNIXTIME(ab.unbandate) AS expires_at, ab.bannedby, ab.banreason, ab.active FROM account_banned ab JOIN account a ON ab.id = a.id ORDER BY ab.bandate DESC LIMIT 50",
  },
  {
    label: 'IP bans',
    db: 'auth',
    query: "SELECT ip, FROM_UNIXTIME(bandate) AS banned_at, FROM_UNIXTIME(unbandate) AS expires_at, bannedby, banreason FROM ip_banned ORDER BY bandate DESC LIMIT 50",
  },
  {
    label: 'Character inventory',
    db: 'characters',
    query: 'SELECT c.name AS character_name, COUNT(i.item) AS items FROM characters c LEFT JOIN character_inventory i ON c.guid = i.guid GROUP BY c.guid, c.name ORDER BY items DESC LIMIT 20;',
  },
];

const DB_OPTIONS   = ['characters', 'auth', 'world'];
const PAGE_SIZES   = [15, 25, 50, 100, 200, 'All'];

export default function DBQueryPage() {
  const [activePreset, setActivePreset] = useState(null);
  const [query, setQuery]       = useState('');
  const [database, setDatabase] = useState('characters');
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pageInput, setPageInput] = useState('');

  const runQuery = async (q, db) => {
    setLoading(true);
    setError('');
    setResult(null);
    setPage(1);
    setPageInput('');
    try {
      const data = await api.dbQuery(q, db);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (p) => {
    setActivePreset(p.label);
    setQuery(p.query);
    setDatabase(p.db);
    runQuery(p.query, p.db);
  };

  const handleRun = () => {
    if (!query.trim()) return;
    setActivePreset(null);
    runQuery(query.trim(), database);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleRun();
    }
  };

  return (
    <div className="page db-page">
      <h2 className="page-title">Database Query</h2>
      <p className="page-sub">
        Requires Administrator (GM level ≥ 3). All queries are audit logged.
      </p>

      <div className="db-layout">
        <aside className="db-presets">
          <div className="presets-label">Presets</div>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              className={`preset-btn${activePreset === p.label ? ' active' : ''}`}
              onClick={() => handlePreset(p)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </aside>

        <div className="db-main">
          <div className="db-controls">
            <select
              value={database}
              onChange={(e) => { setDatabase(e.target.value); setActivePreset(null); }}
              className="input input-sm db-select"
              disabled={loading}
            >
              {DB_OPTIONS.map((db) => (
                <option key={db} value={db}>{db}</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRun}
              disabled={loading || !query.trim()}
            >
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          <textarea
            className="query-textarea"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActivePreset(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Enter SQL query… (Ctrl+Enter to run)"
            rows={5}
            spellCheck={false}
            disabled={loading}
          />

          {error && <div className="alert alert-error">{error}</div>}

          {result && (
            <div className="query-results">
              <div className="results-meta">
                {result.affectedRows != null
                  ? `Query OK — ${result.affectedRows} row(s) affected`
                  : `${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}`}
              </div>
              {result.columns?.length > 0 && (() => {
                const isAll      = pageSize === 'All';
                const totalPages = isAll ? 1 : Math.ceil(result.rows.length / pageSize);
                const pageRows   = isAll ? result.rows : result.rows.slice((page - 1) * pageSize, page * pageSize);

                const commitPageInput = () => {
                  const n = parseInt(pageInput, 10);
                  if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
                  setPageInput('');
                };

                return (
                  <>
                    <div className="table-wrap">
                      <table className="data-table db-result-table">
                        <thead>
                          <tr>
                            {result.columns.map((c) => (
                              <th key={c}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, i) => (
                            <tr key={i}>
                              {result.columns.map((c) => (
                                <td key={c}>{row[c] ?? <span className="null-val">NULL</span>}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pagination-row">
                      {!isAll && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>← Prev</button>
                          <span className="pagination-info">
                            Page{' '}
                            <input
                              className="page-jump-input"
                              value={pageInput !== '' ? pageInput : page}
                              onChange={(e) => setPageInput(e.target.value)}
                              onBlur={commitPageInput}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitPageInput(); }}
                            />
                            {' '}of {totalPages}
                          </span>
                          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next →</button>
                        </>
                      )}
                      <select
                        className="input input-sm"
                        value={pageSize}
                        onChange={(e) => {
                          const v = e.target.value === 'All' ? 'All' : parseInt(e.target.value, 10);
                          setPageSize(v);
                          setPage(1);
                          setPageInput('');
                        }}
                      >
                        {PAGE_SIZES.map((s) => (
                          <option key={s} value={s}>{s} rows</option>
                        ))}
                      </select>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
