import React, { useState } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function ConfirmModal({ title, body, warning, confirmLabel, confirmClass = 'btn-danger', onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{body}</p>
          {warning && (
            <div className="alert alert-warning" style={{ marginTop: 12 }}>
              ⚠ {warning}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ManageCard({ title, description, warning, buttonLabel, buttonClass = 'btn-warning', onAction, busy }) {
  return (
    <div className="settings-card" style={{ marginBottom: 16 }}>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-label">{title}</span>
          <span className="settings-row-description">{description}</span>
          {warning && (
            <div className="alert alert-warning" style={{ marginTop: 8, padding: '8px 12px', fontSize: 12 }}>
              ⚠ {warning}
            </div>
          )}
        </div>
        <div className="settings-row-control">
          <button
            className={`btn ${buttonClass}`}
            onClick={onAction}
            disabled={busy}
            style={{ whiteSpace: 'nowrap' }}
          >
            {busy ? 'Working…' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardManagePage() {
  const [confirm, setConfirm] = useState(null); // { key, title, body, warning, confirmLabel, confirmClass }
  const [busy, setBusy]       = useState({});

  const run = async (key, fn) => {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await fn();
      if (res?.manual) {
        toast(res.message, 'info');
      } else {
        toast(`${key} restart initiated`);
      }
    } catch {
      // Expected for backend restart — connection drops
      toast('Restart initiated');
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
      setConfirm(null);
    }
  };

  const actions = {
    backend:  () => run('Backend',  api.restartBackend),
    agent:    () => run('Agent',    api.restartAgent),
    frontend: () => run('Frontend', api.restartFrontend),
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard Management</h2>
      </div>

      <div className="settings-section-title" style={{ marginBottom: 8 }}>Process Control</div>

      <ManageCard
        title="Restart Backend"
        description="Restarts the Express API server. All active sessions remain valid. The frontend will automatically reconnect within a few seconds."
        buttonLabel="Restart Backend"
        buttonClass="btn-warning"
        busy={!!busy.Backend}
        onAction={() => setConfirm({
          key: 'backend',
          title: 'Restart Backend?',
          body: 'The API server will restart. The frontend will reconnect automatically.',
          confirmLabel: 'Restart Backend',
          confirmClass: 'btn-warning',
        })}
      />

      <ManageCard
        title="Restart Server Agent"
        description="Restarts the standalone server agent process that manages the worldserver and authserver."
        warning="The worldserver and authserver will become unmanaged while the agent restarts. Running game servers will NOT be shut down but cannot be monitored or controlled until the agent is back online."
        buttonLabel="Restart Agent"
        buttonClass="btn-danger"
        busy={!!busy.Agent}
        onAction={() => setConfirm({
          key: 'agent',
          title: 'Restart Server Agent?',
          body: 'The server agent will restart. Game servers will be temporarily unmanaged.',
          warning: 'The worldserver and authserver will be unresponsive to dashboard commands until the agent is back online. Running game servers will NOT be stopped, but crashes during this window will not be detected or auto-restarted.',
          confirmLabel: 'Restart Agent',
          confirmClass: 'btn-danger',
        })}
      />

      <ManageCard
        title="Restart Frontend"
        description="The Vite development server cannot be restarted remotely. If you are running a production build, the frontend is served as static files and does not need restarting."
        buttonLabel="Restart Frontend"
        buttonClass="btn-secondary"
        busy={!!busy.Frontend}
        onAction={() => setConfirm({
          key: 'frontend',
          title: 'Restart Frontend?',
          body: 'The frontend (Vite dev server) cannot be restarted remotely. You will need to restart it manually in the terminal.',
          confirmLabel: 'OK',
          confirmClass: 'btn-secondary',
        })}
      />

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          warning={confirm.warning}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          onConfirm={actions[confirm.key]}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
