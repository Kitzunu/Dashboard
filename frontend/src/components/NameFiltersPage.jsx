import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

function RemoveModal({ name, type, onConfirm, onClose }) {
  const label = type === 'profanity' ? 'profanity' : 'reserved';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Remove <span className="player-name-em">{name}</span>?</h3>
        <p className="modal-detail">This will remove <code>{name}</code> from the {label} name list.</p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>Remove</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function NameFiltersPage() {
  const [profanity, setProfanity]   = useState([]);
  const [reserved,  setReserved]    = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState('');
  const [tab,       setTab]         = useState('profanity'); // 'profanity' | 'reserved'

  const [filterText,    setFilterText]    = useState('');
  const [newName,       setNewName]       = useState('');
  const [adding,        setAdding]        = useState(false);
  const [addError,      setAddError]      = useState('');
  const [removeTarget,  setRemoveTarget]  = useState(null); // name string to confirm removal

  const load = useCallback(async () => {
    try {
      const data = await api.getNameFilters();
      setProfanity(data.profanity);
      setReserved(data.reserved);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset filter/add state when switching tabs
  useEffect(() => {
    setFilterText('');
    setNewName('');
    setAddError('');
  }, [tab]);

  const list    = tab === 'profanity' ? profanity : reserved;
  const q       = filterText.trim().toLowerCase();
  const visible = q ? list.filter(n => n.toLowerCase().includes(q)) : list;

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setAddError('');
    try {
      await api.addNameFilter(tab, name);
      setNewName('');
      await load();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    try {
      await api.removeNameFilter(tab, removeTarget);
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
      setRemoveTarget(null);
    }
  };

  const tabLabel = tab === 'profanity' ? 'Profanity' : 'Reserved';

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Name Filters</h2>
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>

      <div className="tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${tab === 'profanity' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('profanity')}
        >
          🤬 Profanity ({profanity.length})
        </button>
        <button
          className={`btn ${tab === 'reserved' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('reserved')}
        >
          🔒 Reserved ({reserved.length})
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            className="filter-input"
            type="text"
            placeholder={`Add ${tabLabel} name (max 12 chars)…`}
            value={newName}
            maxLength={12}
            onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
            style={{ width: 260 }}
          />
          {addError && <span style={{ color: 'var(--color-danger, #e53e3e)', fontSize: 12 }}>{addError}</span>}
        </div>
        <button className="btn btn-primary" type="submit" disabled={adding || !newName.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      <div className="filter-row">
        <input
          className="filter-input"
          type="text"
          placeholder={`Filter ${tabLabel} names…`}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-text">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-cell">
                    {q ? 'No names match that filter' : `No ${tabLabel.toLowerCase()} names`}
                  </td>
                </tr>
              ) : (
                visible.map((name) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td className="td-actions">
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => setRemoveTarget(name)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {q && visible.length > 0 && (
            <div className="td-muted" style={{ padding: '6px 8px', fontSize: 12 }}>
              Showing {visible.length} of {list.length}
            </div>
          )}
        </div>
      )}

      {removeTarget && (
        <RemoveModal
          name={removeTarget}
          type={tab}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
