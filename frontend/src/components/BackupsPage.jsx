import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString();
}

function DeleteModal({ file, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Delete Backup</h3></div>
        <div className="modal-body">
          <p>Delete <strong>{file.name}</strong> ({formatSize(file.size)})? This cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function BackupsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteFile, setDeleteFile] = useState(null);
  const [dbFilter, setDbFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBackups();
      setFiles(data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (file) => {
    try {
      const { blob, filename } = await api.downloadBackup(file.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast('Download started');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async () => {
    const f = deleteFile;
    setDeleteFile(null);
    try {
      await api.deleteBackup(f.name);
      setFiles((prev) => prev.filter((x) => x.name !== f.name));
      toast('Backup deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const databases = [...new Set(files.map((f) => f.database))].sort();
  const filtered = dbFilter ? files.filter((f) => f.database === dbFilter) : files;
  const totalSize = filtered.reduce((s, f) => s + f.size, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Backup Management</h2>
          <p className="page-sub">Browse, download, and manage database backups</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>

      <div className="filter-row" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="filter-input" value={dbFilter} onChange={(e) => setDbFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All databases</option>
          {databases.map((db) => (
            <option key={db} value={db}>{db}</option>
          ))}
        </select>
        <span className="td-muted" style={{ fontSize: 13 }}>
          {filtered.length} file{filtered.length !== 1 ? 's' : ''} · {formatSize(totalSize)} total
        </span>
      </div>

      {loading ? (
        <div className="loading-text">Loading backups…</div>
      ) : filtered.length === 0 ? (
        <div className="alert" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
          No backup files found. Backups are created by scheduled tasks.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Database</th>
                <th>Size</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.name}>
                  <td className="td-name mono" style={{ fontSize: 12 }}>{f.name}</td>
                  <td><span className="badge badge-info">{f.database}</span></td>
                  <td className="td-muted">{formatSize(f.size)}</td>
                  <td className="td-muted">{formatDate(f.created)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => handleDownload(f)}>
                        Download
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteFile(f)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteFile && (
        <DeleteModal file={deleteFile} onConfirm={handleDelete} onClose={() => setDeleteFile(null)} />
      )}
    </div>
  );
}
