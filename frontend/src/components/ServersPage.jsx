import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Stop modal ────────────────────────────────────────────────────────────────
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

// ── Server card ───────────────────────────────────────────────────────────────
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

// ── Scheduled restart section ─────────────────────────────────────────────────
const PRESET_DELAYS = [
  { label: '1 min',  seconds: 60 },
  { label: '5 min',  seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
];

function RestartSection({ worldRunning }) {
  const [delay, setDelay]         = useState(300);
  const [customDelay, setCustom]  = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [busy, setBusy]           = useState(false);

  const effectiveDelay = useCustom
    ? Math.max(1, parseInt(customDelay, 10) || 1)
    : delay;

  const handleRestart = async () => {
    setBusy(true);
    try {
      await api.restartServer(effectiveDelay);
      const mins = Math.round(effectiveDelay / 60);
      toast(`Server restart scheduled in ${mins > 0 ? `${mins}m` : `${effectiveDelay}s`} — core will announce in-game`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await api.cancelRestart();
      toast('Scheduled restart cancelled');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tools-section">
      <h3 className="tools-section-title">Scheduled Restart</h3>
      <p className="tools-section-sub">
        Sends <code>server restart &lt;delay&gt;</code> to the worldserver. The core handles
        in-game countdown announcements automatically.
      </p>

      {!worldRunning && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          Worldserver is not running — restart command will have no effect.
        </div>
      )}

      <div className="restart-presets">
        {PRESET_DELAYS.map((p) => (
          <button
            key={p.seconds}
            type="button"
            className={`btn btn-secondary btn-xs restart-preset ${!useCustom && delay === p.seconds ? 'active' : ''}`}
            onClick={() => { setDelay(p.seconds); setUseCustom(false); }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`btn btn-secondary btn-xs restart-preset ${useCustom ? 'active' : ''}`}
          onClick={() => setUseCustom(true)}
        >
          Custom
        </button>
      </div>

      {useCustom && (
        <div className="form-group" style={{ marginTop: 10 }}>
          <label>Custom delay (seconds)</label>
          <input
            type="number"
            min="1"
            value={customDelay}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. 120"
            style={{ maxWidth: 160 }}
          />
        </div>
      )}

      <div className="restart-actions">
        <button
          className="btn btn-warning"
          onClick={handleRestart}
          disabled={busy || (useCustom && !parseInt(customDelay, 10))}
        >
          {busy ? 'Sending…' : `Schedule Restart (${
            useCustom
              ? `${parseInt(customDelay, 10) || '?'}s`
              : PRESET_DELAYS.find((p) => p.seconds === delay)?.label
          })`}
        </button>
        <button
          className="btn btn-ghost"
          onClick={handleCancel}
          disabled={busy}
        >
          Cancel Restart
        </button>
      </div>
    </div>
  );
}

// ── MOTD section ──────────────────────────────────────────────────────────────
function MOTDSection() {
  const [motd, setMotd]         = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.getMOTD()
      .then((d) => { setMotd(d.motd ?? ''); setOriginal(d.motd ?? ''); })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = motd !== original;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setMOTD(motd);
      setOriginal(motd);
      toast('MOTD updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tools-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="tools-section-title">Message of the Day</h3>
          <p className="tools-section-sub">
            Shown to players when they log in. Sends <code>server set motd</code> to the worldserver.
          </p>
        </div>
        {isDirty && <span className="config-dirty-badge">Unsaved</span>}
      </div>

      {loading ? (
        <div className="loading-text">Loading MOTD…</div>
      ) : (
        <>
          <div className="motd-current">
            <span className="motd-current-label">Current MOTD</span>
            <span className="motd-current-value">
              {original || <em style={{ color: 'var(--text-dim)' }}>No MOTD set</em>}
            </span>
          </div>

          <textarea
            className="announce-textarea"
            rows={4}
            value={motd}
            onChange={(e) => setMotd(e.target.value)}
            placeholder="Enter the message of the day…"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!isDirty || saving || !motd.trim()}
            >
              {saving ? 'Saving…' : 'Save MOTD'}
            </button>
            {isDirty && (
              <button className="btn btn-ghost" onClick={() => setMotd(original)}>
                Discard
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ServersPage({ serverStatus, setServerStatus }) {
  const [busy, setBusy]           = useState(false);
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

      <RestartSection worldRunning={serverStatus.worldserver.running} />
      <MOTDSection />

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
