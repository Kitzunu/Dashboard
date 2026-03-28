import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

function StopModal({ name, onConfirm, onClose }) {
  const isWorld = name === 'worldserver';
  const [mode, setMode] = useState('exit');
  const [delay, setDelay] = useState(60);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Stop <span className="player-name-em">{name}</span></h3>

        {isWorld ? (
          <div className="form-group">
            <label>Stop method</label>
            <div className="stop-options">
              <label className="stop-option">
                <input
                  type="radio"
                  name="stop-mode"
                  value="exit"
                  checked={mode === 'exit'}
                  onChange={() => setMode('exit')}
                />
                <div>
                  <strong>Server Exit</strong>
                  <span>Saves state and exits immediately</span>
                </div>
              </label>
              <label className="stop-option">
                <input
                  type="radio"
                  name="stop-mode"
                  value="shutdown"
                  checked={mode === 'shutdown'}
                  onChange={() => setMode('shutdown')}
                />
                <div>
                  <strong>Server Shutdown</strong>
                  <span>Notifies players and shuts down after a delay</span>
                </div>
              </label>
            </div>
            {mode === 'shutdown' && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  value={delay}
                  onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="modal-detail">The auth server will be terminated immediately.</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={() => onConfirm(mode, delay)}>
            Stop
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ServerCard({ name, displayName, status, onStart, onStop, onAutoRestartToggle, busy }) {
  const isRunning = status.running;
  return (
    <div className={`server-card ${isRunning ? 'card-running' : 'card-stopped'}`}>
      <div className="server-card-top">
        <div>
          <h3 className="server-card-name">{displayName}</h3>
          <code className="server-card-bin">{name}.exe</code>
        </div>
        <span className={`badge ${isRunning ? 'badge-green' : 'badge-red'}`}>
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>
      <div className="server-card-actions">
        {isRunning ? (
          <button className="btn btn-danger" onClick={() => onStop(name)} disabled={busy}>
            Stop Server
          </button>
        ) : (
          <button className="btn btn-success" onClick={() => onStart(name)} disabled={busy}>
            Start Server
          </button>
        )}
      </div>
      <label className="autorestart-toggle">
        <input
          type="checkbox"
          checked={status.autoRestart || false}
          onChange={(e) => onAutoRestartToggle(name, e.target.checked)}
        />
        <span>Auto-restart on crash</span>
      </label>
    </div>
  );
}

export default function ServersPage({ serverStatus, setServerStatus }) {
  const [busy, setBusy] = useState(false);
  const [stopTarget, setStopTarget] = useState(null);

  useEffect(() => {
    api.getServerStatus()
      .then(setServerStatus)
      .catch(() => {});
  }, []);

  const handleStart = async (name) => {
    setBusy(true);
    try {
      const result = await api.startServer(name);
      if (result.success) {
        toast(`${name} starting…`);
        setServerStatus((prev) => ({ ...prev, [name]: { ...prev[name], running: true } }));
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStopConfirm = async (mode, delay) => {
    const name = stopTarget;
    setStopTarget(null);
    setBusy(true);
    try {
      const result = await api.stopServer(name, mode, delay);
      if (result.success) {
        const label = name === 'worldserver'
          ? (mode === 'shutdown' ? `Shutdown in ${delay}s sent to ${name}` : `Exit sent to ${name}`)
          : `Stop signal sent to ${name}`;
        toast(label);
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAutoRestartToggle = async (name, enabled) => {
    try {
      await api.setAutoRestart(name, enabled);
      setServerStatus((prev) => ({
        ...prev,
        [name]: { ...prev[name], autoRestart: enabled },
      }));
      toast(`Auto-restart ${enabled ? 'enabled' : 'disabled'} for ${name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">Server Management</h2>
      <p className="page-sub">
        Servers are started as child processes of this dashboard. Configure paths in <code>.env</code>.
      </p>

      <div className="server-cards">
        <ServerCard
          name="worldserver"
          displayName="World Server"
          status={serverStatus.worldserver}
          onStart={handleStart}
          onStop={setStopTarget}
          onAutoRestartToggle={handleAutoRestartToggle}
          busy={busy}
        />
        <ServerCard
          name="authserver"
          displayName="Auth Server"
          status={serverStatus.authserver}
          onStart={handleStart}
          onStop={setStopTarget}
          onAutoRestartToggle={handleAutoRestartToggle}
          busy={busy}
        />
      </div>

      {stopTarget && (
        <StopModal
          name={stopTarget}
          onConfirm={handleStopConfirm}
          onClose={() => setStopTarget(null)}
        />
      )}
    </div>
  );
}
