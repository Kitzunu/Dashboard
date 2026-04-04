import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString();
}

function CommitDetailModal({ entry, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>
            <span className="badge badge-dim" style={{ fontFamily: 'var(--font-mono)', marginRight: 10 }}>
              {entry.hash}
            </span>
            {entry.subject}
          </h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
        </div>

        <div className="account-detail-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Author</label>
            <span className="td-name">{entry.author || '—'}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Date</label>
            <span className="td-muted">{formatDate(entry.date)}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Commit</label>
            {entry.link ? (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}
              >
                {entry.hash}
              </a>
            ) : (
              <span className="td-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{entry.hash}</span>
            )}
          </div>
        </div>

        {entry.body && (
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Description</label>
            <pre style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text)', margin: 0, maxHeight: 300, overflowY: 'auto',
            }}>
              {entry.body}
            </pre>
          </div>
        )}

        {entry.link && (
          <div className="modal-footer" style={{ marginTop: 20 }}>
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              View on GitHub ↗
            </a>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchChangelog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getChangelog();
      setEntries(data.entries || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChangelog();
  }, [fetchChangelog]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Changelog</h2>
        <span className="td-muted" style={{ fontSize: 13 }}>
          {entries.length} commit{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Hash</th>
              <th>Subject</th>
              <th style={{ width: 140 }}>Author</th>
              <th style={{ width: 170 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                  No changelog entries yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.hash}
                  className="data-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(entry)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    {entry.link ? (
                      <a
                        href={entry.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge badge-dim"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textDecoration: 'none' }}
                      >
                        {entry.hash}
                      </a>
                    ) : (
                      <span className="badge badge-dim" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {entry.hash}
                      </span>
                    )}
                  </td>
                  <td className="td-name">{entry.subject}</td>
                  <td className="td-muted">{entry.author || '—'}</td>
                  <td className="td-muted">{formatDate(entry.date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CommitDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
