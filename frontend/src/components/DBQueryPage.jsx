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
    query: 'SELECT c.name AS character, COUNT(i.guid) AS items FROM characters c LEFT JOIN character_inventory i ON c.guid = i.guid GROUP BY c.name ORDER BY items DESC LIMIT 20',
  },
];

export default function DBQueryPage() {
  const [activePreset, setActivePreset] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const runPreset = async (p) => {
    setActivePreset(p.label);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.dbQuery(p.query, p.db);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page db-page">
      <h2 className="page-title">Database Query</h2>
      <p className="page-sub">
        Requires Administrator (GM level ≥ 3).
      </p>

      <div className="db-layout">
        <aside className="db-presets">
          <div className="presets-label">Presets</div>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              className={`preset-btn${activePreset === p.label ? ' active' : ''}`}
              onClick={() => runPreset(p)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </aside>

        <div className="db-main">
          {loading && <div className="alert alert-info">Running query…</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {result && (
            <div className="query-results">
              <div className="results-meta">
                {result.affectedRows != null
                  ? `Query OK — ${result.affectedRows} row(s) affected`
                  : `${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}`}
              </div>
              {result.columns.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {result.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          {result.columns.map((c) => (
                            <td key={c}>{row[c] ?? <span className="null-val">NULL</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
