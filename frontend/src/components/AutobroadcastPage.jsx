import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Weight badge ───────────────────────────────────────────────────────────────
function WeightBadge({ weight }) {
  let cls = 'badge-dim';
  if (weight >= 50) cls = 'badge-success';
  else if (weight >= 20) cls = 'badge-warn';
  return <span className={`badge ${cls}`}>{weight}</span>;
}

// ── Add / Edit modal ───────────────────────────────────────────────────────────
function EditModal({ entry, onSave, onClose }) {
  const isNew = entry === null;
  const [text, setText]     = useState(isNew ? '' : entry.text);
  const [weight, setWeight] = useState(isNew ? 1 : entry.weight);
  const [saving, setSaving] = useState(false);

  const valid = text.trim().length > 0 && weight >= 1 && weight <= 100;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(text.trim(), Number(weight));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {isNew ? 'Add Autobroadcast' : `Edit Autobroadcast #${entry.id}`}
        </h3>

        <div className="form-group">
          <label>Message</label>
          <textarea
            className="ticket-textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the broadcast message…"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Weight (1–100, higher = more frequent)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <small>
            Higher weight means this message is selected more often relative to others.
          </small>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!valid || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ entry, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete autobroadcast #{entry.id}?</h3>
        <p className="modal-detail td-muted">{entry.text}</p>
        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Confirm Delete'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AutobroadcastPage() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [editTarget, setEditTarget] = useState(undefined); // undefined = closed, null = new, obj = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      const data = await api.getAutobroadcasts();
      setRows(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  // ── Create ──
  const handleCreate = async (text, weight) => {
    try {
      await api.createAutobroadcast(text, weight);
      toast('Autobroadcast added');
      setEditTarget(undefined);
      await loadRows();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // ── Update ──
  const handleUpdate = async (id, text, weight) => {
    try {
      await api.updateAutobroadcast(id, text, weight);
      toast(`Autobroadcast #${id} updated`);
      setEditTarget(undefined);
      await loadRows();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    try {
      await api.deleteAutobroadcast(id);
      toast(`Autobroadcast #${id} deleted`);
      setDeleteTarget(null);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Autobroadcasts</h2>
          <p className="page-sub">
            Recurring messages broadcast automatically in-game
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => setEditTarget(null)}
          >
            Add New
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadRows}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading autobroadcasts…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Message</th>
                <th style={{ width: 100 }}>Weight</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    No autobroadcasts configured
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="td-mono td-muted">{row.id}</td>
                    <td>{row.text}</td>
                    <td><WeightBadge weight={row.weight} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => setEditTarget(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleteTarget(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal (editTarget === null) */}
      {editTarget === null && (
        <EditModal
          entry={null}
          onSave={handleCreate}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      {/* Edit modal (editTarget is an object) */}
      {editTarget && typeof editTarget === 'object' && (
        <EditModal
          entry={editTarget}
          onSave={(text, weight) => handleUpdate(editTarget.id, text, weight)}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          entry={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
