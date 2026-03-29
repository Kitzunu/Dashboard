import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const TYPES = ['announce', 'notify'];
const MAX_LEN = 200;

const TEMPLATES = [
  'Server restart in 15 minutes',
  'Server restart in 5 minutes',
  'Maintenance starting soon — please log out',
  'Event starting now — head to Dalaran!',
];

function fmt(ts) {
  if (!ts) return '—';
  // Accept both Unix seconds and ISO strings
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleString();
}

export default function AnnouncePage() {
  const [type, setType]       = useState('announce');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError]     = useState('');

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getAnnouncements();
      setHistory(Array.isArray(data) ? data : []);
      setHistError('');
    } catch (err) {
      setHistError(err.message);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await api.sendAnnouncement(type, trimmed);
      toast(`${type === 'announce' ? 'Announcement' : 'Notification'} sent`);
      setMessage('');
      await loadHistory();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  const trimmed = message.trim();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Announcements</h2>
          <p className="page-sub">Broadcast messages to online players</p>
        </div>
      </div>

      {/* ── Compose ── */}
      <div className="announce-compose">
        {/* Type selector */}
        <div className="form-group">
          <label>Announcement type</label>
          <div className="ban-type-tabs">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`ban-type-tab ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <small className="type-hint">
            {type === 'announce'
              ? 'Appears in chat as [System] — all players see it in their chat log'
              : 'Appears as a floating on-screen notice — more visible, no chat log entry'}
          </small>
        </div>

        {/* Textarea */}
        <div className="form-group">
          <label>Message</label>
          <textarea
            className="announce-textarea"
            rows={4}
            maxLength={MAX_LEN}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              type === 'announce'
                ? 'Enter an announcement to broadcast in chat…'
                : 'Enter a notification to display on screen…'
            }
          />
          <div className="char-counter" style={{ textAlign: 'right' }}>
            <span className={message.length >= MAX_LEN ? 'char-counter-max' : ''}>
              {message.length} / {MAX_LEN}
            </span>
          </div>
        </div>

        {/* Quick templates */}
        <div className="form-group">
          <label>Quick templates</label>
          <div className="template-grid">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                className="btn btn-ghost btn-xs template-btn"
                onClick={() => setMessage(tpl)}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Send button */}
        <div className="announce-send-row">
          <button
            className={`btn ${type === 'announce' ? 'btn-danger' : 'btn-warning'}`}
            onClick={handleSend}
            disabled={!trimmed || sending}
          >
            {sending
              ? 'Sending…'
              : type === 'announce'
                ? 'Send Announcement'
                : 'Send Notification'}
          </button>
          <small className="send-hint">Ctrl+Enter to send</small>
        </div>
      </div>

      {/* ── History ── */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-title">History</h3>
        <button
          className="btn btn-secondary btn-xs"
          onClick={loadHistory}
          disabled={histLoading}
        >
          Refresh
        </button>
      </div>

      {histError && <div className="alert alert-error">{histError}</div>}

      {histLoading ? (
        <div className="loading-text">Loading history…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Message</th>
                <th>Sent By</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">No announcements sent yet</td>
                </tr>
              ) : (
                history.map((row, i) => (
                  <tr key={row.id ?? i}>
                    <td className="td-muted">{fmt(row.sentAt ?? row.sent_at ?? row.timestamp)}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.type === 'notify' ? 'badge-warn' : 'badge-info'
                        }`}
                      >
                        {row.type === 'notify' ? 'Notify' : 'Announce'}
                      </span>
                    </td>
                    <td>{row.message}</td>
                    <td className="td-muted">{row.sentBy ?? row.sent_by ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
