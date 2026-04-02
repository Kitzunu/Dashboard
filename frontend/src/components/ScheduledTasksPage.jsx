import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Constants ─────────────────────────────────────────────────────────────────
// Display order: Mon–Sun. Each entry is [dayIndex (0=Sun…6=Sat), label].
const DAY_ORDER = [[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']];
const ALL_DAYS  = [0, 1, 2, 3, 4, 5, 6];

const DB_OPTIONS = [
  { key: 'auth',       label: 'Auth',       defaultName: 'acore_auth'       },
  { key: 'world',      label: 'World',      defaultName: 'acore_world'      },
  { key: 'characters', label: 'Characters', defaultName: 'acore_characters' },
  { key: 'dashboard',  label: 'Dashboard',  defaultName: 'acore_dashboard'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(hour, minute) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
}

function fmtDays(daysStr) {
  const days = String(daysStr).split(',').map(Number);
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'Never';
  const weekdays = [1, 2, 3, 4, 5];
  const weekend  = [0, 6];
  if (weekdays.every((d) => days.includes(d)) && days.length === 5) return 'Weekdays';
  if (weekend.every((d) => days.includes(d)) && days.length === 2)  return 'Weekends';
  return DAY_ORDER.filter(([d]) => days.includes(d)).map(([, l]) => l).join(', ');
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function defaultConfig(type) {
  if (type === 'restart') return { servers: ['worldserver'], delay: 60 };
  if (type === 'backup')  return { databases: ['acore_auth', 'acore_world', 'acore_characters'] };
  return {};
}

// ── Task modal (create + edit) ────────────────────────────────────────────────
function TaskModal({ task, onClose, onSaved }) {
  const editing = !!task;

  const [name,    setName]    = useState(task?.name    ?? '');
  const [type,    setType]    = useState(task?.type    ?? 'backup');
  const [hour,   setHour]   = useState(task?.hour   ?? 3);
  const [minute, setMinute] = useState(task?.minute ?? 0);
  const [days,    setDays]    = useState(() =>
    task ? String(task.days).split(',').map(Number) : ALL_DAYS
  );
  const [enabled, setEnabled] = useState(task?.enabled !== 0);
  const [config,  setConfig]  = useState(() => {
    if (task?.config) return typeof task.config === 'string' ? JSON.parse(task.config) : task.config;
    return defaultConfig(task?.type ?? 'backup');
  });
  const [busy, setBusy] = useState(false);

  // Reset config when type changes
  const handleTypeChange = (t) => {
    setType(t);
    setConfig(defaultConfig(t));
  };

  const toggleDay = (d) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));

  const setAllDays    = () => setDays([...ALL_DAYS]);
  const setWeekdays   = () => setDays([1, 2, 3, 4, 5]);
  const setWeekend    = () => setDays([0, 6]);

  // Config helpers for restart
  const toggleServer = (s) => {
    const cur = config.servers || [];
    setConfig((c) => ({
      ...c,
      servers: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    }));
  };

  // Config helpers for backup
  const toggleDb = (dbName) => {
    const cur = config.databases || [];
    setConfig((c) => ({
      ...c,
      databases: cur.includes(dbName) ? cur.filter((x) => x !== dbName) : [...cur, dbName],
    }));
  };

  const valid = name.trim() && days.length > 0 &&
    (type !== 'restart' || (config.servers || []).length > 0) &&
    (type !== 'backup'  || (config.databases || []).length > 0);

  const handleSave = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), type, hour, minute, days, enabled, config };
      const result  = editing
        ? await api.updateScheduledTask(task.id, payload)
        : await api.createScheduledTask(payload);
      toast(`Task "${name.trim()}" ${editing ? 'updated' : 'created'}`);
      onSaved(result.task);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Task' : 'New Scheduled Task'}</h3>

        {/* Name */}
        <div className="form-group">
          <label>Task Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nightly Backup" autoFocus />
        </div>

        {/* Type */}
        <div className="form-group">
          <label>Type</label>
          <div className="ban-type-tabs">
            <button type="button"
              className={`ban-type-tab ${type === 'backup' ? 'active' : ''}`}
              onClick={() => handleTypeChange('backup')}>
              Database Backup
            </button>
            <button type="button"
              className={`ban-type-tab ${type === 'restart' ? 'active' : ''}`}
              onClick={() => handleTypeChange('restart')}>
              Server Restart
            </button>
          </div>
        </div>

        {/* Type-specific config */}
        {type === 'backup' && (
          <div className="form-group">
            <label>Databases to back up</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DB_OPTIONS.map(({ key, label, defaultName }) => (
                <label key={key} className={`account-flag-item${(config.databases || []).includes(defaultName) ? ' account-flag-active' : ''}`}
                  style={{ cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={(config.databases || []).includes(defaultName)}
                    onChange={() => toggleDb(defaultName)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {type === 'restart' && (
          <>
            <div className="form-group">
              <label>Servers to restart</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['worldserver', 'authserver'].map((s) => (
                  <label key={s} className={`account-flag-item${(config.servers || []).includes(s) ? ' account-flag-active' : ''}`}
                    style={{ cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={(config.servers || []).includes(s)}
                      onChange={() => toggleServer(s)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Shutdown delay (seconds)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="3600" style={{ width: 100 }}
                  value={config.delay ?? 60}
                  onChange={(e) => setConfig((c) => ({ ...c, delay: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
                <span className="td-muted">seconds before shutdown</span>
              </div>
            </div>
          </>
        )}

        {/* Time */}
        <div className="form-group">
          <label>Run at</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min="0" max="23" value={String(hour).padStart(2, '0')}
              onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              style={{ width: 58, textAlign: 'center' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dim)' }}>:</span>
            <input type="number" min="0" max="59" value={String(minute).padStart(2, '0')}
              onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              style={{ width: 58, textAlign: 'center' }} />
          </div>
        </div>

        {/* Days */}
        <div className="form-group">
          <label>Days</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button type="button" className="btn btn-ghost btn-xs" onClick={setAllDays}>Every day</button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={setWeekdays}>Weekdays</button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={setWeekend}>Weekends</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAY_ORDER.map(([d, label]) => (
              <button key={d} type="button"
                className={`btn btn-xs ${days.includes(d) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleDay(d)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Enabled */}
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="task-enabled" checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)} />
          <label htmlFor="task-enabled" style={{ margin: 0, cursor: 'pointer' }}>Enabled</label>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid || busy}>
            {busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function DeleteModal({ task, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Task</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
          Delete <strong style={{ color: 'var(--text)' }}>{task.name}</strong>? This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ScheduledTasksPage() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [editTask,   setEditTask]   = useState(null);   // null = closed, task obj = edit, 'new' = create
  const [deleteTask, setDeleteTask] = useState(null);
  const [running, setRunning] = useState({}); // id → true while running

  const load = useCallback(async () => {
    try {
      const data = await api.getScheduledTasks();
      setTasks(data.tasks);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx === -1) return [...prev, task];
      const next = [...prev];
      next[idx] = task;
      return next;
    });
  };

  const handleDelete = async () => {
    const t = deleteTask;
    setDeleteTask(null);
    try {
      await api.deleteScheduledTask(t.id);
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
      toast(`Task "${t.name}" deleted`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleToggleEnabled = async (task) => {
    try {
      const config = typeof task.config === 'string' ? JSON.parse(task.config) : (task.config || {});
      const days   = String(task.days).split(',').map(Number);
      const result = await api.updateScheduledTask(task.id, {
        ...task, config, days, enabled: !task.enabled,
      });
      setTasks((prev) => prev.map((t) => t.id === task.id ? result.task : t));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRunNow = async (task) => {
    setRunning((r) => ({ ...r, [task.id]: true }));
    try {
      const result = await api.runScheduledTask(task.id);
      toast(`"${task.name}" completed: ${result.status}`);
      load(); // refresh last_run
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRunning((r) => ({ ...r, [task.id]: false }));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Scheduled Tasks</h2>
          <p className="page-sub">Automate server restarts and database backups</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setEditTask('new')}>
            New Task
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="alert" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
          No scheduled tasks yet. Click <strong>New Task</strong> to create one.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Last Run</th>
                <th>Last Status</th>
                <th>Enabled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} style={{ opacity: t.enabled ? 1 : 0.5 }}>
                  <td className="td-name">{t.name}</td>
                  <td>
                    <span className={`badge ${t.type === 'backup' ? 'badge-info' : 'badge-warn'}`}>
                      {t.type === 'backup' ? 'Backup' : 'Restart'}
                    </span>
                  </td>
                  <td className="td-muted">
                    {fmtTime(t.hour, t.minute)} · {fmtDays(t.days)}
                  </td>
                  <td className="td-muted">{fmtDateTime(t.last_run)}</td>
                  <td>
                    {t.last_status
                      ? <span style={{ color: t.last_status.startsWith('Error') ? 'var(--red)' : 'var(--green)', fontSize: 12 }}>
                          {t.last_status}
                        </span>
                      : <span className="td-muted">—</span>
                    }
                  </td>
                  <td>
                    <input type="checkbox" checked={!!t.enabled}
                      onChange={() => handleToggleEnabled(t)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-xs"
                        onClick={() => handleRunNow(t)}
                        disabled={!!running[t.id]}>
                        {running[t.id] ? '…' : 'Run Now'}
                      </button>
                      <button className="btn btn-ghost btn-xs"
                        onClick={() => setEditTask(t)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-xs"
                        onClick={() => setDeleteTask(t)}>
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

      {editTask && (
        <TaskModal
          task={editTask === 'new' ? null : editTask}
          onClose={() => setEditTask(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteTask && (
        <DeleteModal task={deleteTask} onConfirm={handleDelete}
          onClose={() => setDeleteTask(null)} />
      )}
    </div>
  );
}
