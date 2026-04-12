import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import { toast } from '../toast.js';
import SortTh from './SortTh.jsx';
import { useServerStatus } from '../context/ServerContext.jsx';
import RealmSelector from './RealmSelector.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
const FEEDBACK_LABELS = { 0: 'Bug', 1: 'Suggestion', 2: 'Survey' };
const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: '0',   label: 'Bugs' },
  { value: '1',   label: 'Suggestions' },
  { value: '2',   label: 'Surveys' },
];

function feedbackBadgeClass(num) {
  if (num === 0) return 'badge badge-danger';
  if (num === 1) return 'badge badge-info';
  if (num === 2) return 'badge badge-gold';
  return 'badge badge-dim';
}

// ── Survey rating row ─────────────────────────────────────────────────────────
function SurveyRatingRow({ label, value, text, max }) {
  const isNA = !text || text === 'N/A';
  return (
    <div className="bug-report-rating-row">
      <span className="bug-report-field-label">{label}</span>
      <div className="bug-report-rating-right">
        <span className={`bug-report-rating-text${isNA ? ' td-muted' : ''}`}>{text || 'N/A'}</span>
        {!isNA && (
          <span className="bug-report-stars">
            {Array.from({ length: max }, (_, i) => (
              <span key={i} className={i < value ? 'star star-on' : 'star star-off'} />
            ))}
          </span>
        )}
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

// ── Detail modal ──────────────────────────────────────────────────────────────
function ReportDetailModal({ id, canEdit, onClose, onUpdated, realmId }) {
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(false);
  const [assignee, setAssignee] = useState('');
  const [comment,  setComment]  = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getBugReport(id, realmId)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setAssignee(r.assignee || '');
        setComment(r.comment  || '');
        setLoading(false);
      })
      .catch((err) => { if (!cancelled) { toast(err.message, 'error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id, realmId]);

  const handleToggleState = async () => {
    if (!report) return;
    const newState = report.state === 1 ? 0 : 1;
    setBusy(true);
    try {
      await api.updateBugReport(id, { state: newState }, realmId);
      const updated = { ...report, state: newState };
      setReport(updated);
      onUpdated({ id, state: newState });
      toast(newState === 0 ? 'Report closed' : 'Report reopened');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAssignee = async () => {
    setBusy(true);
    try {
      await api.updateBugReport(id, { assignee: assignee.trim() || null }, realmId);
      setReport((r) => ({ ...r, assignee: assignee.trim() || null }));
      onUpdated({ id, assignee: assignee.trim() || null });
      toast('Assignee updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveComment = async () => {
    setBusy(true);
    try {
      await api.updateBugReport(id, { comment: comment.trim() || null }, realmId);
      setReport((r) => ({ ...r, comment: comment.trim() || null }));
      onUpdated({ id, comment: comment.trim() || null });
      toast('Comment saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bug-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Report #{id}
            {report && (
              <span className={`badge ${report.state === 1 ? 'badge-success' : 'badge-dim'}`} style={{ marginLeft: 10, fontSize: 11 }}>
                {report.state === 1 ? 'Open' : 'Closed'}
              </span>
            )}
          </h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        {loading ? (
          <div className="loading-text" style={{ padding: '24px' }}>Loading&hellip;</div>
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

            {/* Admin fields */}
            {canEdit && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Admin</div>
                <div className="bug-report-admin-fields">
                  <div className="bug-report-admin-row">
                    <label className="bug-report-field-label">Assignee</label>
                    <input
                      className="input input-sm"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="Username or name"
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={handleSaveAssignee} disabled={busy}>
                      Save
                    </button>
                  </div>
                  <div className="bug-report-admin-row" style={{ alignItems: 'flex-start' }}>
                    <label className="bug-report-field-label" style={{ paddingTop: 6 }}>Comment</label>
                    <textarea
                      className="input input-sm"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Internal note or comment"
                      rows={3}
                      style={{ flex: 1, resize: 'vertical' }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={handleSaveComment} disabled={busy} style={{ alignSelf: 'flex-end' }}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show assignee / comment read-only for non-editors if set */}
            {!canEdit && (report.assignee || report.comment) && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Admin</div>
                <div className="bug-report-grid">
                  {report.assignee && <Field label="Assignee" value={report.assignee} />}
                  {report.comment  && <Field label="Comment"  value={report.comment}  />}
                </div>
              </div>
            )}

            {/* User description */}
            {report.userText && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Description</div>
                <div className="bug-report-user-text">{report.userText}</div>
              </div>
            )}

            {/* Reporter */}
            <div className="bug-report-section">
              <div className="bug-report-section-title">Reporter</div>
              <div className="bug-report-grid">
                <Field label="Character" value={report.character} />
                <Field label="Account"   value={report.account} />
                <Field label="Realm"     value={report.realm} />
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
                  <Field label="Zone"     value={report.zone} />
                  <Field label="Map"      value={report.map} />
                  <Field label="Coords"   value={report.coords} />
                  <Field label="Position" value={report.position} />
                </div>
              </div>
            )}

            {/* Survey ratings */}
            {report.surveyRatings && report.surveyRatings.length > 0 && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">
                  Survey Ratings
                  {report.surveyType && report.surveyType !== '—' && (
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: 'var(--text-dim)' }}>
                      &middot; {report.surveyType}
                    </span>
                  )}
                </div>
                <div className="bug-report-ratings">
                  {report.surveyRatings.map((r) => (
                    <SurveyRatingRow key={r.label} {...r} />
                  ))}
                </div>
              </div>
            )}

            {/* Classification */}
            {report.classification && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Classification</div>
                <div className="bug-report-grid">
                  {report.classification.subjectType && <Field label="Subject Type" value={report.classification.subjectType} />}
                  {report.classification.subjectId   && <Field label="Subject ID"   value={report.classification.subjectId} mono />}
                  {report.classification.where       && <Field label="Where"        value={report.classification.where} />}
                  {report.classification.who         && <Field label="Who"          value={report.classification.who} />}
                  {report.classification.type        && <Field label="Type"         value={report.classification.type} />}
                  {report.classification.when        && <Field label="When"         value={report.classification.when} />}
                </div>
              </div>
            )}

            {/* System */}
            {(report.os !== '—' || report.computer !== '—' || report.memory !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">System</div>
                <div className="bug-report-grid">
                  <Field label="OS"          value={report.os} />
                  <Field label="Computer"    value={report.computer} />
                  <Field label="Memory"      value={report.memory} />
                  <Field label="Processors"  value={report.processors} />
                  <Field label="CPU Vendor"  value={report.processorVendor} />
                  <Field label="CPU Speed"   value={report.processorSpeed} />
                  <Field label="WoW Version" value={report.wowVersion} />
                  <Field label="Build"       value={report.build} />
                  <Field label="Locale"      value={report.locale} />
                </div>
              </div>
            )}

            {/* Addons */}
            {(report.addonsLoaded !== '—' || report.addonsDisabled !== '—' || report.addonTitle !== '—') && (
              <div className="bug-report-section">
                <div className="bug-report-section-title">Addons</div>
                <div className="bug-report-grid">
                  <Field label="Related Addon"   value={report.addonTitle} />
                  <Field label="Addon Version"   value={report.addonVersion} />
                  <Field label="Addons Loaded"   value={report.addonsLoaded} />
                  <Field label="Addons Disabled" value={report.addonsDisabled} />
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
          {canEdit && report && (
            <button
              className={`btn btn-sm ${report.state === 1 ? 'btn-ghost' : 'btn-success'}`}
              onClick={handleToggleState}
              disabled={busy}
            >
              {busy ? '&hellip;' : report.state === 1 ? 'Close Report' : 'Reopen Report'}
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

// ── Sort helpers ──────────────────────────────────────────────────────────────
function sortReports(reports, col, dir) {
  const sorted = [...reports].sort((a, b) => {
    let av = a[col] ?? '';
    let bv = b[col] ?? '';
    if (col === 'id') { av = Number(av); bv = Number(bv); }
    else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return -1;
    if (av > bv) return  1;
    return 0;
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function BugReportsPage() {
  const { auth } = useAuth();
  const { selectedRealmId } = useServerStatus();
  const canEdit = auth.gmlevel >= 2;

  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stateTab,   setStateTab]   = useState('1');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search,     setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortCol,    setSortCol]    = useState('id');
  const [sortDir,    setSortDir]    = useState('desc');
  const [selectedId, setSelectedId] = useState(null);

  const fetchReports = useCallback(async (p, type, state, q) => {
    setLoading(true);
    try {
      const data = await api.getBugReports(p, type, state, q, selectedRealmId);
      setReports(data.reports);
      setTotalPages(data.pages);
      setTotalCount(data.total);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRealmId]);

  useEffect(() => {
    fetchReports(page, typeFilter, stateTab, search);
  }, [page, typeFilter, stateTab, search, selectedRealmId, fetchReports]);

  const handleStateTabChange  = (val) => { setStateTab(val);   setPage(1); };
  const handleTypeFilterChange = (val) => { setTypeFilter(val); setPage(1); };
  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleSearchKey = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handleSort = (col) => {
    if (col === sortCol) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleUpdated = ({ id, state, assignee, comment }) => {
    setReports((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r };
      if (state    !== undefined) updated.state    = state;
      if (assignee !== undefined) updated.assignee = assignee;
      if (comment  !== undefined) updated.comment  = comment;
      return updated;
    }));
    if (state !== undefined) fetchReports(page, typeFilter, stateTab, search);
  };

  const displayReports = sortReports(reports, sortCol, sortDir);
  const sortProps = { sortCol, sortDir, onSort: handleSort };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Bug Reports</h2>
          <span className="td-muted" style={{ fontSize: 13 }}>{totalCount} report{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <RealmSelector />
      </div>

      {/* State tabs */}
      <div className="tab-row" style={{ marginBottom: 8 }}>
        <button className={`tab-btn${stateTab === '1' ? ' active' : ''}`} onClick={() => handleStateTabChange('1')}>Open</button>
        <button className={`tab-btn${stateTab === '0' ? ' active' : ''}`} onClick={() => handleStateTabChange('0')}>Closed</button>
      </div>

      {/* Toolbar: type filter + search */}
      <div className="bug-reports-toolbar">
        <div className="tab-row">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button key={opt.value} className={`tab-btn${typeFilter === opt.value ? ' active' : ''}`}
              onClick={() => handleTypeFilterChange(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="filter-row" style={{ marginTop: 8 }}>
          <input
            className="filter-input"
            type="text"
            placeholder="Search character, zone, subject, assignee&hellip;"
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
              <SortTh col="id"            label="ID"        {...sortProps} style={{ width: 60 }} />
              <SortTh col="feedbackType"  label="Type"      {...sortProps} style={{ width: 110 }} />
              <SortTh col="character"     label="Character" {...sortProps} />
              <SortTh col="zone"          label="Zone"      {...sortProps} />
              <SortTh col="reportSubject" label="Subject"   {...sortProps} />
              <SortTh col="assignee"      label="Assignee"  {...sortProps} />
              <SortTh col="reportDate"    label="Date"      {...sortProps} />
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>Loading&hellip;</td></tr>
            ) : displayReports.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                {search ? `No reports matching "${search}".` : `No ${stateTab === '1' ? 'open' : 'closed'} reports.`}
              </td></tr>
            ) : (
              displayReports.map((r) => (
                <tr key={r.id} className="data-row clickable" onClick={() => setSelectedId(r.id)}>
                  <td className="td-muted mono">{r.id}</td>
                  <td><span className={feedbackBadgeClass(r.feedbackTypeNum)}>{r.feedbackType}</span></td>
                  <td>{r.character !== '—' ? r.character : <span className="td-muted">Unknown</span>}</td>
                  <td className="td-muted">{r.zone !== '—' ? r.zone : '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reportSubject !== '—' ? r.reportSubject : <span className="td-muted">—</span>}
                  </td>
                  <td className="td-muted">{r.assignee || <span className="td-muted">—</span>}</td>
                  <td className="td-muted">{r.reportDate !== '—' ? r.reportDate : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>
                        View
                      </button>
                      {canEdit && (
                        <button
                          className={`btn btn-xs ${r.state === 1 ? 'btn-ghost' : 'btn-success'}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newState = r.state === 1 ? 0 : 1;
                            try {
                              await api.updateBugReport(r.id, { state: newState }, selectedRealmId);
                              toast(newState === 0 ? 'Report closed' : 'Report reopened');
                              fetchReports(page, typeFilter, stateTab, search);
                            } catch (err) {
                              toast(err.message, 'error');
                            }
                          }}
                        >
                          {r.state === 1 ? 'Close' : 'Reopen'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            &laquo; Prev
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next &raquo;
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedId != null && (
        <ReportDetailModal
          id={selectedId}
          canEdit={canEdit}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          realmId={selectedRealmId}
        />
      )}
    </div>
  );
}
