import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function fmt(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString();
}

// type: 0 = open, 1 = closed, 2 = character deleted
function ticketTypeLabel(type) {
  if (type === 1) return { label: 'Closed',   cls: 'badge-red'  };
  if (type === 2) return { label: 'Char Deleted', cls: 'badge-red' };
  return null; // open — no badge needed
}

// Normalise DB column-name variants into consistent field names
function normalise(t) {
  return {
    ...t,
    type:             Number(t.type             ?? 0),
    assignedTo:       Number(t.assignedTo       ?? t.assigned_to        ?? 0),
    createTime:       Number(t.createTime       ?? t.create_time        ?? 0),
    lastModifiedTime: Number(t.lastModifiedTime ?? t.last_modified_time ?? 0),
    playerGuid:       Number(t.playerGuid       ?? t.player_guid        ?? 0),
    escalated:        Number(t.escalated        ?? 0) === 1,
    viewed:           Number(t.viewed           ?? 1) === 1,
    assignedToName:   t.assignedToName || null,
  };
}

// ── Respond / Close modal ─────────────────────────────────────────────────────
function RespondModal({ ticket, onConfirm, onClose }) {
  const [response, setResponse]   = useState('');
  const [closeAfter, setCloseAfter] = useState(true);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>
          Respond to Ticket <span className="player-name-em">#{ticket.id}</span>
        </h3>
        <p className="modal-detail">
          From: <strong>{ticket.characterName || ticket.name}</strong>
        </p>
        <p className="modal-detail">{ticket.description}</p>

        <div className="form-group">
          <label>Response (optional)</label>
          <textarea
            className="ticket-textarea"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Enter your response…"
            rows={4}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={closeAfter}
              onChange={(e) => setCloseAfter(e.target.checked)}
            />
            Close ticket after responding
          </label>
        </div>

        <div className="modal-actions modal-actions-wrap">
          <button
            className="btn btn-success"
            onClick={() => onConfirm(ticket.id, response.trim(), closeAfter)}
          >
            {closeAfter ? 'Respond & Close' : 'Respond'}
          </button>
          <button
            className="btn btn-warning"
            onClick={() => onConfirm(ticket.id, '', true)}
          >
            Close (no response)
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Single ticket row + expandable detail ─────────────────────────────────────
function TicketRow({ ticket: raw, onRespond, onAction, onViewCharacter }) {
  const ticket = normalise(raw);
  const [expanded, setExpanded]     = useState(false);
  const [assignInput, setAssignInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [busy, setBusy] = useState(false);
  const playerName = ticket.characterName || ticket.name || `GUID:${ticket.playerGuid}`;
  const typeMeta   = ticketTypeLabel(ticket.type);

  const doAction = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <>
      <tr
        className={`ticket-row ${expanded ? 'ticket-row-expanded' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="td-mono td-muted">#{ticket.id}</td>
        <td className="td-name" onClick={(e) => e.stopPropagation()}>
          {onViewCharacter && ticket.playerGuid
            ? <button className="btn-link" onClick={() => onViewCharacter(ticket.playerGuid)}>{playerName}</button>
            : playerName}
        </td>
        <td className="ticket-desc-cell">{ticket.description}</td>
        <td className="td-muted">{fmt(ticket.createTime)}</td>
        {/* Assigned To */}
        <td className="td-muted">
          {ticket.assignedToName
            ? <span className="ticket-assigned-name">{ticket.assignedToName}</span>
            : <span className="td-muted">—</span>}
        </td>
        {/* Status badges */}
        <td className="ticket-status-cell">
          {typeMeta         && <span className={`badge ${typeMeta.cls}`}>{typeMeta.label}</span>}
          {ticket.escalated && <span className="badge badge-warn">⚠ Escalated</span>}
          {!ticket.viewed   && <span className="badge badge-info">New</span>}
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-primary btn-xs"
            onClick={() => onRespond(ticket)}
          >
            Respond
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="ticket-detail-row">
          <td colSpan={7}>
            <div className="ticket-detail">
              {/* Meta grid */}
              <div className="ticket-detail-grid">
                <div><strong>Player:</strong> {playerName} (GUID {ticket.playerGuid})</div>
                <div><strong>Created:</strong> {fmt(ticket.createTime)}</div>
                <div><strong>Last updated:</strong> {fmt(ticket.lastModifiedTime)}</div>
                <div>
                  <strong>Assigned to:</strong>{' '}
                  {ticket.assignedToName
                    ? <span className="ticket-assigned-name">{ticket.assignedToName}</span>
                    : <span className="td-muted">Unassigned</span>}
                </div>
              </div>

              {ticket.comment  && <div className="ticket-meta"><strong>GM comment:</strong> <span className="td-muted">{ticket.comment}</span></div>}
              {ticket.response && <div className="ticket-meta"><strong>Last response:</strong> <span className="td-muted">{ticket.response}</span></div>}

              <div className="ticket-full-desc">
                <strong>Full message:</strong>
                <p>{ticket.description}</p>
              </div>

              {/* ── Action row ─────────────────────────────────────── */}
              <div className="ticket-actions-row">
                {/* Assign / Unassign */}
                <div className="ticket-assign-group">
                  <input
                    className="ticket-assign-input"
                    type="text"
                    placeholder="GM name to assign…"
                    value={assignInput}
                    onChange={(e) => setAssignInput(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && assignInput.trim()) {
                        e.stopPropagation();
                        doAction(() => onAction(ticket.id, 'assign', assignInput.trim()));
                        setAssignInput('');
                      }
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-xs"
                    disabled={!assignInput.trim() || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      doAction(() => onAction(ticket.id, 'assign', assignInput.trim()));
                      setAssignInput('');
                    }}
                  >
                    Assign
                  </button>
                  {ticket.assignedTo > 0 && (
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        doAction(() => onAction(ticket.id, 'unassign'));
                      }}
                    >
                      Unassign
                    </button>
                  )}
                </div>

                {/* Escalate / De-escalate */}
                <button
                  className={`btn btn-xs ${ticket.escalated ? 'btn-ghost' : 'btn-warning'}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    doAction(() => onAction(ticket.id, ticket.escalated ? 'deescalate' : 'escalate'));
                  }}
                >
                  {ticket.escalated ? 'De-escalate' : '⚠ Escalate'}
                </button>
              </div>

              {/* ── Comment row ────────────────────────────────────── */}
              <div className="ticket-comment-row">
                <input
                  className="ticket-assign-input ticket-comment-input"
                  type="text"
                  placeholder="Add a GM comment…"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentInput.trim()) {
                      e.stopPropagation();
                      doAction(() => onAction(ticket.id, 'comment', commentInput.trim()));
                      setCommentInput('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-xs"
                  disabled={!commentInput.trim() || busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    doAction(() => onAction(ticket.id, 'comment', commentInput.trim()));
                    setCommentInput('');
                  }}
                >
                  Add Comment
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TicketsPage({ onViewCharacter }) {
  const [tickets, setTickets]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [showAll, setShowAll]             = useState(false);
  const [respondTarget, setRespondTarget] = useState(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = showAll ? await api.getAllTickets() : await api.getTickets();
      setTickets(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    setLoading(true);
    loadTickets();
    const interval = setInterval(loadTickets, 60000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const handleRespond = async (id, response, close) => {
    setRespondTarget(null);
    try {
      if (response) {
        const r = await api.respondTicket(id, response);
        if (r.success === false) { toast(r.error || 'Failed to send response', 'error'); return; }
      }
      if (close) {
        const r = await api.closeTicket(id);
        if (r.success === false) { toast(r.error || 'Failed to close ticket', 'error'); return; }
        if (!showAll) setTickets((prev) => prev.filter((t) => t.id !== id));
      }
      toast(`Ticket #${id} ${close ? 'closed' : 'responded to'}`);
      setTimeout(loadTickets, 3000);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleAction = async (id, action, value) => {
    try {
      let r;
      if (action === 'assign')     r = await api.assignTicket(id, value);
      if (action === 'unassign')   r = await api.unassignTicket(id);
      if (action === 'escalate')   r = await api.escalateTicket(id);
      if (action === 'deescalate') r = await api.deescalateTicket(id);
      if (action === 'comment')    r = await api.commentTicket(id, value);
      if (r?.success === false) { toast(r.error || 'Action failed', 'error'); return; }

      const actionLabels = {
        assign: `assigned to ${value}`, unassign: 'unassigned',
        escalate: 'escalated', deescalate: 'de-escalated',
        comment: 'comment added',
      };
      toast(`Ticket #${id}: ${actionLabels[action]}`);

      // Optimistic local state update
      setTickets((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        if (action === 'assign')     return { ...t, assignedTo: 1, assignedToName: value };
        if (action === 'unassign')   return { ...t, assignedTo: 0, assignedToName: null };
        if (action === 'escalate')   return { ...t, escalated: 1 };
        if (action === 'deescalate') return { ...t, escalated: 0 };
        if (action === 'comment')    return { ...t, comment: value };
        return t;
      }));
      setTimeout(loadTickets, 3000);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">GM Tickets</h2>
          <p className="page-sub">
            {showAll ? 'Showing all tickets' : 'Showing open tickets'}
            {!loading && ` — ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${showAll ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Open Only' : 'Show All'}
          </button>
          <button className="btn btn-secondary" onClick={loadTickets} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading tickets…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Message</th>
                <th>Created</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    {showAll ? 'No tickets found' : 'No open tickets — all caught up! 🎉'}
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    onRespond={setRespondTarget}
                    onAction={handleAction}
                    onViewCharacter={onViewCharacter}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {respondTarget && (
        <RespondModal
          ticket={respondTarget}
          onConfirm={handleRespond}
          onClose={() => setRespondTarget(null)}
        />
      )}
    </div>
  );
}
