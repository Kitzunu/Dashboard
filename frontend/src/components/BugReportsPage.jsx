import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const FEEDBACK_LABELS = { 0: 'Bug', 1: 'Suggestion', 2: 'Feedback' };
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: '0',   label: 'Bugs' },
  { value: '1',   label: 'Suggestions' },
  { value: '2',   label: 'Feedback' },
];

function feedbackBadgeClass(num) {
  if (num === 0) return 'badge badge-danger';
  if (num === 1) return 'badge badge-info';
  return 'badge badge-dim';
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function ReportDetailModal({ id, onClose, canDelete, onDeleted }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getBugReport(id)
      .then((r) => { if (!cancelled) { setReport(r); setLoading(false); } })
      .catch((err) => { if (!cancelled) { toast(err.message, 'error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteBugReport(id);
      toast('Report dismissed');
      onDeleted(id);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bug-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Report #{id}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-text" style={{ padding: '24px' }}>Loading…</div>
        ) : !report ? (
          <div className="alert alert-error" style={{ margin: 16 }}>Failed to load report.</div>
        ) : (
          <div className="bug-report-detail">
            {/* Header summary */}
            <div className="bug-report-summary-row">
              <span className={feedbackBadgeClass(report.feedbackTypeNum)}>{report.feedbackType}</span>
              {report.surveyType && report.surveyType !== '—' && (
                <span className="badge badge-dim">{report.surveyType}</span>
              )}
              {report.reportDate && report.reportDate !== '—' && (
                <span className="bug-report-date">{report.reportDate}</span>
              )}
            </div>

            {/* User text / description */}
            {report.userText && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Description</div>
                <div className="bug-report-user-text">{report.userText}</div>
              </div>
            )}

            {/* Reporter info */}
            <div className="bug-report-section">
              <div className="bug-report-section-title">Reporter</div>
              <div className="bug-report-grid">
                <Field label="Character"   value={report.character} />
                <Field label="Account"     value={report.account} />
                <Field label="Realm"       value={report.realm} />
                {report.charDesc && report.charDesc !== '—' && (
                  <Field label="Char Info" value={report.charDesc} />
                )}
              </div>
            </div>

            {/* Location */}
            {(report.zone !== '—' || report.map !== '—' || report.coords !== '—' || report.position !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Location</div>
                <div className="bug-report-grid">
                  <Field label="Zone"       value={report.zone} />
                  <Field label="Map"        value={report.map} />
                  <Field label="Coords"     value={report.coords} />
                  <Field label="Position"   value={report.position} />
                </div>
              </div>
            )}

            {/* Subject / target */}
            {(report.reportSubject !== '—' || report.target !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Subject</div>
                <div className="bug-report-grid">
                  <Field label="Subject"      value={report.reportSubject} />
                  <Field label="Subject Type" value={report.reportSubjectType} />
                  <Field label="Target"       value={report.target} />
                  {report.targetGUID !== '—' && (
                    <Field label="Target GUID" value={report.targetGUID} mono />
                  )}
                </div>
              </div>
            )}

            {/* System info */}
            {(report.os !== '—' || report.computer !== '—' || report.memory !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">System</div>
                <div className="bug-report-grid">
                  <Field label="OS"              value={report.os} />
                  <Field label="Computer"        value={report.computer} />
                  <Field label="Memory"          value={report.memory} />
                  <Field label="Processors"      value={report.processors} />
                  <Field label="CPU Vendor"      value={report.processorVendor} />
                  <Field label="CPU Speed"       value={report.processorSpeed} />
                  <Field label="WoW Version"     value={report.wowVersion} />
                  <Field label="Build"           value={report.build} />
                  <Field label="Locale"          value={report.locale} />
                </div>
              </div>
            )}

            {/* Addons */}
            {(report.addonsLoaded !== '—' || report.addonsDisabled !== '—' || report.addonTitle !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Addons</div>
                <div className="bug-report-grid">
                  <Field label="Related Addon"    value={report.addonTitle} />
                  <Field label="Addon Version"    value={report.addonVersion} />
                  <Field label="Addons Loaded"    value={report.addonsLoaded} />
                  <Field label="Addons Disabled"  value={report.addonsDisabled} />
                </div>
              </div>
            )}

            {/* Auras */}
            {report.auras && report.auras !== '—' && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Active Auras</div>
                <pre className="bug-report-auras">{report.auras}</pre>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          {canDelete && report && (
            confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--warn)' }}>Dismiss this report?</span>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Dismissing…' : 'Yes, dismiss'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
                Dismiss Report
              </button>
            )
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
  if (!value || value === '—') return null;
  return (
    <div className="bug-report-field">
      <span className="bug-report-field-label">{label}</span>
      <span className={`bug-report-field-value${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BugReportsPage() {
  const { auth } = useAuth();
  const canDelete = auth.gmlevel >= 2;

  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [filter, setFilter]           = useState('all');
  const [selectedId, setSelectedId]   = useState(null);

  const fetchReports = useCallback(async (p, f) => {
    setLoading(true);
    try {
      const data = await api.getBugReports(p, f);
      setReports(data.reports);
      setTotalPages(data.pages);
      setTotalCount(data.total);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(page, filter);
  }, [page, filter, fetchReports]);

  const handleFilterChange = (val) => {
    setFilter(val);
    setPage(1);
  };

  const handleDeleted = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((c) => c - 1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Bug Reports</h2>
        <span className="td-muted" style={{ fontSize: 13 }}>{totalCount} report{totalCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter bar */}
      <div className="bug-reports-toolbar">
        <div className="tab-row">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`tab-btn${filter === opt.value ? ' active' : ''}`}
              onClick={() => handleFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 120 }}>Type</th>
              <th>Character</th>
              <th>Zone</th>
              <th>Subject</th>
              <th>Date</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>No reports found.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="data-row clickable" onClick={() => setSelectedId(r.id)}>
                  <td className="td-muted mono">{r.id}</td>
                  <td><span className={feedbackBadgeClass(r.feedbackTypeNum)}>{r.feedbackType}</span></td>
                  <td>{r.character !== '—' ? r.character : <span className="td-muted">Unknown</span>}</td>
                  <td className="td-muted">{r.zone !== '—' ? r.zone : '—'}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reportSubject !== '—' ? r.reportSubject : <span className="td-muted">—</span>}
                  </td>
                  <td className="td-muted">{r.reportDate !== '—' ? r.reportDate : '—'}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Prev
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedId != null && (
        <ReportDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canDelete={canDelete}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
