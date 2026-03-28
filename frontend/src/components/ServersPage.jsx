import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

function ServerCard({ name, displayName, status, onStart, onStop, busy }) {
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
          <button
            className="btn btn-danger"
            onClick={() => onStop(name)}
            disabled={busy}
          >
            Stop Server
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={() => onStart(name)}
            disabled={busy}
          >
            Start Server
          </button>
        )}
      </div>
    </div>
  );
}

export default function ServersPage({ serverStatus, setServerStatus }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.getServerStatus()
      .then(setServerStatus)
      .catch(() => {});
  }, []);

  const flash = (msg, isError = false) => {
    setMessage({ text: msg, error: isError });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleStart = async (name) => {
    setBusy(true);
    try {
      const result = await api.startServer(name);
      if (result.success) {
        flash(`${name} started`);
        setServerStatus((prev) => ({ ...prev, [name]: { running: true } }));
      } else {
        flash(result.error, true);
      }
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async (name) => {
    if (!window.confirm(`Stop ${name}? This will disconnect all connected players.`)) return;
    setBusy(true);
    try {
      const result = await api.stopServer(name);
      if (result.success) {
        flash(`Stop signal sent to ${name}`);
        setServerStatus((prev) => ({ ...prev, [name]: { running: false } }));
      } else {
        flash(result.error, true);
      }
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">Server Management</h2>
      <p className="page-sub">
        Servers are started as child processes of this dashboard. Configure paths in <code>.env</code>.
      </p>

      {message && (
        <div className={`alert ${message.error ? 'alert-error' : 'alert-info'}`}>
          {message.text}
        </div>
      )}

      <div className="server-cards">
        <ServerCard
          name="worldserver"
          displayName="World Server"
          status={serverStatus.worldserver}
          onStart={handleStart}
          onStop={handleStop}
          busy={busy}
        />
        <ServerCard
          name="authserver"
          displayName="Auth Server"
          status={serverStatus.authserver}
          onStart={handleStart}
          onStop={handleStop}
          busy={busy}
        />
      </div>
    </div>
  );
}
