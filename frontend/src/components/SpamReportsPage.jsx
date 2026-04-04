import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import { toast } from '../toast.js';

const TYPE_TABS = [
  { value: 'all', label: 'All Types' },
  { value: '0',   label: 'Mail' },
  { value: '1',   label: 'Chat' },
  { value: '2',   label: 'Calendar' },
];

function typeBadgeClass(type) {
  if (type === 0) return 'badge badge-gold';
  if (type === 1) return 'badge badge-info';
  if (type === 2) return 'badge badge-success';
  return 'badge badge-dim';
}

function formatTime(unixSec) {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleString();
}

function formatSeconds(sec) {
  if (!sec && sec !== 0) return null;
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function parseChatDescription(desc) {
  if (!desc) return {};
  const result = {};
  const re = /([A-Za-z][\w\s]+):\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(desc)) !== null) {
    result[m[1].trim()] = m[2].trim();
  }
  return result;
}

function descriptionPreview(report) {
  if (report.spamType === 0) return null;
  if (report.spamType === 2) return report.description || null;
  const parsed = parseChatDescription(report.description);
  return parsed['Text'] || report.description || null;
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
function sortReports(reports, col, dir) {
  const sorted = [...reports].sort((a, b) => {
    let av = a[col] ?? '';
    let bv = b[col] ?? '';
    if (col === 'id' || col === 'time') { av = Number(av); bv = Number(bv); }
    else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}

function SortTh({ col, label, sortCol, sortDir, onSort, style }) {
  const active = sortCol === col;
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
        onClick={() => onSort(col)}>
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25, fontSize: 10 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
      </span>
    </th>
  );
}

// ── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-structured" style={{ width: 400, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: 14 }}>
          {message}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => { onConfirm(); onClose(); }}
            style={{ marginLeft: 'auto' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function SpamDetailModal({ report, canDelete, onClose, onDeleted }) {
  const handleDelete = async () => {
    if (!confirm('Delete this spam report?')) return;
    try {
      await api.deleteSpamReport(report.id);
      toast('Report deleted', 'success');
      onDeleted(report.id);
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const chatFields = report.spamType === 1 ? parseChatDescription(report.description) : {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bug-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Spam Report #{report.id}
            <span className={typeBadgeClass(report.spamType)} style={{ marginLeft: 10, fontSize: 11 }}>
              {report.spamTypeLabel}
            </span>
          </h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        <div className="bug-report-detail">
          {/* Reporter */}
          <div className="bug-report-section">
            <div className="bug-report-section-title">Reported Player</div>
            <div className="bug-report-grid">
              <Field label="Character"    value={report.spammerName} />
              <Field label="GUID"         value={report.spammerGuid} mono />
              <Field label="Reported At"  value={formatTime(report.time)} />
            </div>
          </div>

          {/* Mail */}
          {report.spamType === 0 && (
            <div className="bug-report-section">
              <div className="bug-report-section-title">Mail Details</div>
              <div className="bug-report-grid">
                <Field label="Mail ID" value={report.mailIdOrMessageType} mono />
              </div>
            </div>
          )}

          {/* Chat */}
          {report.spamType === 1 && (
            <>
              <div className="bug-report-section">
                <div className="bug-report-section-title">Chat Details</div>
                <div className="bug-report-grid">
                  <Field label="Channel"        value={chatFields['Channel']} />
                  <Field label="Message Type"   value={chatFields['Type']} mono />
                  <Field label="Player Name"    value={chatFields['Player Name']} />
                  <Field label="Sender GUID"    value={chatFields['Sender GUID']} mono />
                  <Field label="Active Player"  value={chatFields['Active player']} mono />
                  <Field label="Time Since Msg" value={formatSeconds(report.secondsSinceMessage)} />
                </div>
              </div>
              {chatFields['Text'] && (
                <div className="bug-report-section">
                  <div className="bug-report-section-title">Message</div>
                  <div className="bug-report-user-text">{chatFields['Text']}</div>
                </div>
              )}
            </>
          )}

          {/* Calendar */}
          {report.spamType === 2 && (
            <div className="bug-report-section">
              <div className="bug-report-section-title">Calendar Details</div>
              <div className="bug-report-grid">
                <Field label="Event" value={report.description} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete Report
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="bug-report-field">
      <span className="bug-report-field-label">{label}</span>
      <span className={`bug-report-field-value${mono ? ' mono' : ''}`}>{String(value)}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SpamReportsPage() {
  const { auth } = useAuth();
  const canDelete  = auth.gmlevel >= 2;
  const canClearAll = auth.gmlevel >= 3;

  const [reports, setReports]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(1);
  const [typeFilter, setTypeFilter]   = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [sortCol, setSortCol]         = useState('id');
  const [sortDir, setSortDir]         = useState('desc');
  const [selected, setSelected]       = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchReports = useCallback(async (p, t, s) => {
    setLoading(true);
    try {
      const data = await api.getSpamReports(p, t, s);
      setReports(data.reports);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(page, typeFilter, search); }, [page, typeFilter, search]);

  const handleTypeChange = (val) => { setTypeFilter(val); setPage(1); };
  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleSearchKey = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handleSort = (col) => {
    if (col === sortCol) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleDeleted = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
  };

  const handleClearAll = async () => {
    try {
      await api.clearSpamReports();
      toast('All spam reports cleared', 'success');
      setPage(1);
      fetchReports(1, typeFilter, search);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const sortProps = { sortCol, sortDir, onSort: handleSort };
  const displayed = sortReports(reports, sortCol, sortDir);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Spam Reports</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="td-muted" style={{ fontSize: 13 }}>{total} report{total !== 1 ? 's' : ''}</span>
          {canClearAll && total > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmClear(true)}>Clear All</button>
          )}
        </div>
      </div>

      <div className="bug-reports-toolbar">
        {/* Type tabs */}
        <div className="tab-row">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              className={`tab-btn${typeFilter === t.value ? ' active' : ''}`}
              onClick={() => handleTypeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="filter-row" style={{ marginTop: 8 }}>
          <input
            className="filter-input"
            type="text"
            placeholder="Search spammer name or description&hellip;"
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

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh col="id"          label="ID"       {...sortProps} style={{ width: 60 }} />
              <SortTh col="spamType"    label="Type"     {...sortProps} style={{ width: 110 }} />
              <SortTh col="spammerName" label="Reported Player" {...sortProps} />
              <SortTh col="description" label="Details"  {...sortProps} />
              <SortTh col="time"        label="Time"     {...sortProps} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>Loading&hellip;</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                {search ? `No reports matching "${search}".` : 'No spam reports found.'}
              </td></tr>
            ) : (
              displayed.map((r) => {
                const preview = descriptionPreview(r);
                return (
                  <tr key={r.id} className="data-row clickable" onClick={() => setSelected(r)}>
                    <td className="td-muted mono">{r.id}</td>
                    <td><span className={typeBadgeClass(r.spamType)}>{r.spamTypeLabel}</span></td>
                    <td>{r.spammerName}</td>
                    <td className="td-muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview || '—'}
                    </td>
                    <td className="td-muted">{formatTime(r.time)}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {selected && (
        <SpamDetailModal
          report={selected}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onDeleted={handleDeleted}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear All Spam Reports"
          message="This will permanently delete all spam reports. This cannot be undone."
          confirmLabel="Clear All"
          danger
          onConfirm={handleClearAll}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
