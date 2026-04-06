import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { usePaginatedData } from '../hooks/usePaginatedData.js';
import SortTh from './SortTh.jsx';
import { formatDate } from '../utils/format.js';

const SUCCESS_TABS = [
  { value: '',  label: 'All' },
  { value: '1', label: 'Success' },
  { value: '0', label: 'Failed' },
];

const ALL_ACTIONS = [
  'login',
  'logout',
  'server.start',
  'server.stop',
  'server.restart',
  'server.restart_cancel',
  'ban.account',
  'ban.character',
  'ban.ip',
  'unban.account',
  'unban.character',
  'unban.ip',
  'account.create',
  'account.delete',
  'account.set_gmlevel',
  'account.lock',
  'account.unlock',
  'account.set_email',
  'account.set_password',
  'account.mute',
  'account.unmute',
  'channel.unban',
  'channel.delete',
  'bugreport.update',
  'spamreport.delete',
  'spamreport.clear_all',
  'console.command',
  'announcement.send',
  'motd.set',
  'config.save',
  'autobroadcast.create',
  'autobroadcast.update',
  'autobroadcast.delete',
  'mailserver.template_create',
  'mailserver.template_update',
  'mailserver.template_delete',
  'mail.send',
  'dbquery.execute',
  'settings.save',
];

// Map action prefixes to badge styles
function actionBadgeClass(action) {
  if (!action) return 'badge badge-dim';
  if (action.startsWith('login'))                    return 'badge badge-info';
  if (action === 'logout')                           return 'badge badge-dim';
  if (action.startsWith('server.') || action === 'server.restart' || action === 'server.restart_cancel') return 'badge badge-warn';
  if (action.startsWith('ban.') || action.startsWith('unban.'))   return 'badge badge-red';
  if (action.startsWith('account.'))                 return 'badge badge-gold';
  if (action.startsWith('channel.'))                 return 'badge badge-blue';
  if (action.startsWith('bugreport.') || action.startsWith('spamreport.')) return 'badge badge-neutral';
  if (action.startsWith('console.'))                 return 'badge badge-danger';
  if (action.startsWith('announcement.'))            return 'badge badge-green';
  if (action === 'motd.set')                         return 'badge badge-warn';
  if (action.startsWith('config.'))                  return 'badge badge-warn';
  if (action.startsWith('settings.'))                return 'badge badge-warn';
  if (action.startsWith('autobroadcast.'))           return 'badge badge-gold';
  if (action.startsWith('mailserver.'))              return 'badge badge-gold';
  if (action.startsWith('mail.'))                    return 'badge badge-green';
  if (action.startsWith('dbquery.'))                 return 'badge badge-danger';
  return 'badge badge-dim';
}

function ActionMultiSelect({ selected, onChange }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref               = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = ALL_ACTIONS.filter((a) =>
    a.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (action) => {
    if (selected.includes(action)) onChange(selected.filter((a) => a !== action));
    else onChange([...selected, action]);
  };

  const label = selected.length === 0
    ? 'All actions'
    : `${selected.length} action${selected.length !== 1 ? 's' : ''}`;

  return (
    <div className="action-multiselect" ref={ref}>
      <button
        className={`action-multiselect-btn${selected.length > 0 ? ' has-selection' : ''}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span>{label}</span>
        <span className={`action-multiselect-chevron${open ? ' open' : ''}`}>›</span>
      </button>

      {open && (
        <div className="action-multiselect-dropdown">
          <input
            className="action-multiselect-search"
            type="text"
            placeholder="Search actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="action-multiselect-list">
            {filtered.length === 0 ? (
              <div className="action-multiselect-empty">No matches</div>
            ) : (
              filtered.map((action) => (
                <label key={action} className="action-multiselect-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(action)}
                    onChange={() => toggle(action)}
                  />
                  <span className={actionBadgeClass(action)}>{action}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <button
              className="action-multiselect-clear"
              type="button"
              onClick={() => onChange([])}
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function AuditDetailModal({ row, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Audit Entry #{row.id}</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
        </div>

        <div className="account-detail-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Time</label>
            <span className="td-muted">{formatDate(row.created_at)}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>User</label>
            <span className="td-name">{row.username || '—'}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>IP</label>
            <span className="td-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.ip || '—'}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Action</label>
            <span className={actionBadgeClass(row.action)}>{row.action}</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            {row.success
              ? <span className="badge badge-success">OK</span>
              : <span className="badge badge-danger">Failed</span>}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Details</label>
          <pre style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: 'var(--text)', margin: 0, maxHeight: 300, overflowY: 'auto',
          }}>
            {row.details || '—'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [successTab, setSuccessTab]   = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [sortCol, setSortCol]         = useState('id');
  const [sortDir, setSortDir]         = useState('desc');
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchFn = useCallback(
    (p) => api.getAuditLog(p, { success: successTab, actions: selectedActions, search }),
    [successTab, selectedActions, search]
  );
  const { rows, total, pages, page, setPage, loading, fetch: fetchLogs } = usePaginatedData(fetchFn);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  const handleTabChange = (val) => { setSuccessTab(val); setPage(1); };
  const handleActionsChange = (acts) => { setSelectedActions(acts); setPage(1); };
  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleSearchKey = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handleSort = (col) => {
    if (col === sortCol) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const displayed = [...rows].sort((a, b) => {
    let av = a[sortCol] ?? '';
    let bv = b[sortCol] ?? '';
    if (sortCol === 'id') { av = Number(av); bv = Number(bv); }
    else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortProps = { sortCol, sortDir, onSort: handleSort };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Audit Log</h2>
        <span className="td-muted" style={{ fontSize: 13 }}>{total} entr{total !== 1 ? 'ies' : 'y'}</span>
      </div>

      <div className="bug-reports-toolbar">
        <div className="tab-row">
          {SUCCESS_TABS.map((t) => (
            <button
              key={t.value}
              className={`tab-btn${successTab === t.value ? ' active' : ''}`}
              onClick={() => handleTabChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="filter-row" style={{ marginTop: 8 }}>
          <ActionMultiSelect selected={selectedActions} onChange={handleActionsChange} />
          <input
            className="filter-input"
            type="text"
            placeholder="Search user, IP, action, details…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleSearch}>Search</button>
          {search && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh col="id"         label="ID"      {...sortProps} style={{ width: 60 }} />
              <SortTh col="created_at" label="Time"    {...sortProps} style={{ width: 160 }} />
              <SortTh col="username"   label="User"    {...sortProps} style={{ width: 130 }} />
              <SortTh col="ip"         label="IP"      {...sortProps} style={{ width: 130 }} />
              <SortTh col="action"     label="Action"  {...sortProps} style={{ width: 180 }} />
              <th>Details</th>
              <SortTh col="success"    label="Status"  {...sortProps} style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                {search ? `No entries matching "${search}".` : 'No audit entries found.'}
              </td></tr>
            ) : (
              displayed.map((r) => (
                <tr key={r.id} className={`data-row ${r.success ? '' : 'audit-row-failed'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedRow(r)}>
                  <td className="td-muted mono">{r.id}</td>
                  <td className="td-muted">{formatDate(r.created_at)}</td>
                  <td className="td-name">{r.username}</td>
                  <td className="td-muted mono">{r.ip}</td>
                  <td><span className={actionBadgeClass(r.action)}>{r.action}</span></td>
                  <td className="td-muted audit-details-cell">{r.details || '—'}</td>
                  <td>
                    {r.success
                      ? <span className="badge badge-success">OK</span>
                      : <span className="badge badge-danger">Failed</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <AuditDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}

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
    </div>
  );
}
