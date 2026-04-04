import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const SEVERITY_TABS = [
  { value: '',         label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning',  label: 'Warning' },
  { value: 'info',     label: 'Info' },
];

const TYPE_LABELS = {
  latency:          'Latency',
  threshold:        'Resource Threshold',
  server_crash:     'Server Crash',
  server_online:    'Server Online',
  server_stop:      'Server Stopped',
  agent_disconnect: 'Agent Disconnect',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

function severityBadgeClass(severity) {
  switch (severity) {
    case 'critical': return 'badge badge-red';
    case 'warning':  return 'badge badge-warn';
    case 'info':     return 'badge badge-info';
    default:         return 'badge badge-dim';
  }
}

function typeBadgeClass(type) {
  switch (type) {
    case 'latency':          return 'badge badge-blue';
    case 'threshold':        return 'badge badge-warn';
    case 'server_crash':     return 'badge badge-red';
    case 'server_online':    return 'badge badge-green';
    case 'server_stop':      return 'badge badge-dim';
    case 'agent_disconnect': return 'badge badge-danger';
    default:                 return 'badge badge-dim';
  }
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString();
}

function AlertDetailModal({ row, onClose, onDelete }) {
  let metadata = null;
  try { metadata = row.metadata ? JSON.parse(row.metadata) : null; } catch {}

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Alert #{row.id}</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
        </div>

        <div className="account-detail-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Time</label>
            <span className="td-muted">{formatDate(row.created_at)}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Severity</label>
            <span className={severityBadgeClass(row.severity)}>{row.severity}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Type</label>
            <span className={typeBadgeClass(row.type)}>{TYPE_LABELS[row.type] || row.type}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Title</label>
            <span className="td-name">{row.title}</span>
          </div>
        </div>

        {row.description && (
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Description</label>
            <p style={{ margin: 0, color: 'var(--text)' }}>{row.description}</p>
          </div>
        )}

        {metadata && (
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Metadata</label>
            <pre style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text)', margin: 0,
            }}>
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(row.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [severityTab, setSeverityTab] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAlerts = useCallback(async (p, sev, typ) => {
    setLoading(true);
    try {
      const data = await api.getAlerts(p, { severity: sev, type: typ });
      setRows(data.rows);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    fetchAlerts(page, severityTab, typeFilter);
  }, [page, severityTab, typeFilter, fetchAlerts]);

  const handleTabChange = (val) => { setSeverityTab(val); setPage(1); };
  const handleTypeChange = (e) => { setTypeFilter(e.target.value); setPage(1); };

  const handleDelete = async (id) => {
    try {
      await api.deleteAlert(id);
      setSelectedRow(null);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast('Alert deleted.', 'success');
      fetchAlerts(page, severityTab, typeFilter);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await api.deleteAlerts(ids);
      setSelectedIds(new Set());
      setConfirmDeleteSelected(false);
      toast(`${ids.length} alert${ids.length !== 1 ? 's' : ''} deleted.`, 'success');
      fetchAlerts(page, severityTab, typeFilter);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearAll = async () => {
    try {
      await api.clearAlerts({ severity: severityTab, type: typeFilter });
      setConfirmClear(false);
      setPage(1);
      toast('Alerts cleared.', 'success');
      fetchAlerts(1, severityTab, typeFilter);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));

  const clearAllDescription = (() => {
    const parts = [severityTab, typeFilter ? TYPE_LABELS[typeFilter] : ''].filter(Boolean);
    if (parts.length === 0) return 'all alerts';
    return `all ${parts.join(' ')} alerts matching the current filter`;
  })();

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Alerts</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="td-muted" style={{ fontSize: 13 }}>{total} alert{total !== 1 ? 's' : ''}</span>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteSelected(true)}>
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmClear(true)}>
            Clear All
          </button>
        </div>
      </div>

      <div className="bug-reports-toolbar">
        <div className="tab-row">
          {SEVERITY_TABS.map((t) => (
            <button
              key={t.value}
              className={`tab-btn${severityTab === t.value ? ' active' : ''}`}
              onClick={() => handleTabChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="filter-row" style={{ marginTop: 8 }}>
          <select className="filter-input" value={typeFilter} onChange={handleTypeChange} style={{ width: 200 }}>
            <option value="">All types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={handleSelectAll}
                  disabled={rows.length === 0}
                />
              </th>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 160 }}>Time</th>
              <th style={{ width: 90 }}>Severity</th>
              <th style={{ width: 160 }}>Type</th>
              <th>Title</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>No alerts found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="data-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedRow(r)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={(e) => handleSelectRow(e, r.id)}
                    />
                  </td>
                  <td className="td-muted mono">{r.id}</td>
                  <td className="td-muted">{formatDate(r.created_at)}</td>
                  <td><span className={severityBadgeClass(r.severity)}>{r.severity}</span></td>
                  <td><span className={typeBadgeClass(r.type)}>{TYPE_LABELS[r.type] || r.type}</span></td>
                  <td className="td-name">{r.title}</td>
                  <td className="td-muted audit-details-cell">{r.description || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            &laquo; Prev
          </button>
          <span className="pagination-info">Page {page} of {pages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
            Next &raquo;
          </button>
        </div>
      )}

      {selectedRow && (
        <AlertDetailModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onDelete={handleDelete}
        />
      )}

      {confirmDeleteSelected && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteSelected(false)}>
          <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete Selected Alerts</h3></div>
            <div className="modal-body">
              <p>
                This will permanently delete <strong>{selectedIds.size} selected alert{selectedIds.size !== 1 ? 's' : ''}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDeleteSelected}>Delete</button>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteSelected(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="modal-overlay" onClick={() => setConfirmClear(false)}>
          <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Clear All Alerts</h3></div>
            <div className="modal-body">
              <p>
                This will permanently delete <strong>{clearAllDescription}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleClearAll}>Clear All</button>
              <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
