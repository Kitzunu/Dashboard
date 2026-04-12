import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_RACES, FALLBACK_CLASSES, GM_LABELS } from '../constants.js';
import { useAuth } from '../App.jsx';
import { useServerStatus } from '../context/ServerContext.jsx';
import RealmSelector from './RealmSelector.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────
const EXPANSION_LABELS = {
  0: 'Classic', 1: 'The Burning Crusade', 2: 'Wrath of the Lich King',
};

const ACCOUNT_FLAGS = [
  { bit: 1,          name: 'GM',                    desc: 'Account is GM' },
  { bit: 2,          name: 'No Kick',               desc: 'Cannot be kicked' },
  { bit: 4,          name: "Collector's Edition",   desc: "Collector's Edition owner" },
  { bit: 8,          name: 'Trial',                 desc: 'Trial account' },
  { bit: 32,         name: 'IGR',                   desc: 'Internet Game Room (internet café)' },
  { bit: 2048,       name: 'Recruit-A-Friend',      desc: 'Recruit-A-Friend (referer or referee)' },
  { bit: 65536,      name: 'TBC Collector',         desc: "TBC Collector's Edition" },
  { bit: 131072,     name: 'Disable Voice',         desc: 'Cannot join voice chat' },
  { bit: 262144,     name: 'Disable Voice Speak',   desc: 'Cannot speak in voice chat' },
  { bit: 524288,     name: 'Scroll of Resurrection', desc: 'Scroll of Resurrection recipient' },
  { bit: 2097152,    name: 'Dell Promo',            desc: 'Dell XPS WoW Edition Promo' },
  { bit: 8388608,    name: 'Pro Pass',              desc: 'Pro Pass (Arena Tournament)' },
  { bit: 67108864,   name: 'WotLK Collector',       desc: "WotLK Collector's Edition" },
  { bit: 134217728,  name: 'Battle.net Linked',     desc: 'Linked with Battle.net account' },
  { bit: 536870912,  name: 'Death Knight OK',       desc: 'Allowed to create Death Knight' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') return new Date(val * 1000);
  // MySQL DATETIME strings use space separator — replace with T for ISO 8601
  return new Date(String(val).replace(' ', 'T'));
}

function fmtUnix(unix) {
  const d = parseDate(unix);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString();
}

function fmtUnixFull(unix) {
  const d = parseDate(unix);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString();
}

function fmtPlaytime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

const selectStyle = {
  background: 'var(--surface2)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 8px',
};

// ── Reset Password Sub-modal ──────────────────────────────────────────────────
function ResetPasswordModal({ accountId, username, onClose }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = password.length >= 6;

  const handleSubmit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.resetPassword(accountId, password);
      toast(`Password reset for ${username}`);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Reset Password — <span className="player-name-em">{username}</span></h3>
        <div className="form-group">
          <label>New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
          {password.length > 0 && password.length < 6 && (
            <small style={{ color: 'var(--red)' }}>Password must be at least 6 characters</small>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleSubmit} disabled={!valid || busy}>
            {busy ? 'Resetting…' : 'Reset Password'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Lock Confirm Sub-modal ────────────────────────────────────────────────────
function LockConfirmModal({ username, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Lock Account — <span className="player-name-em">{username}</span>?</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
          This will prevent the account from logging in.
        </p>
        <div className="modal-actions">
          <button className="btn btn-warning" onClick={onConfirm}>Lock Account</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
function DeleteAccountModal({ username, onConfirm, onClose }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmed = input === username;

  const handleDelete = async () => {
    if (!confirmed) return;
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
        <h3 style={{ color: 'var(--red)' }}>Delete Account</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
          This permanently deletes <strong style={{ color: 'var(--text)' }}>{username}</strong> and
          all associated characters. This action <strong>cannot be undone</strong>.
        </p>
        <div className="form-group">
          <label>Type the account name to confirm</label>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={username} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleDelete} disabled={!confirmed || busy}>
            {busy ? 'Deleting…' : 'Delete Account'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Email Modal ──────────────────────────────────────────────────────────
function EditEmailModal({ accountId, currentEmail, onClose, onSaved }) {
  const [email, setEmail] = useState(currentEmail || '');
  const [busy, setBusy] = useState(false);
  const valid = email.trim().length > 0;

  const handleSave = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.setEmail(accountId, email.trim());
      toast('Email updated');
      onSaved(email.trim());
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Change Email</h3>
        <div className="form-group">
          <label>New Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="new@email.com" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid || busy}>
            {busy ? 'Saving…' : 'Save Email'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Ban Modal ─────────────────────────────────────────────────────────────────
const BAN_DURATION_PRESETS = [
  { label: '1 hour',  value: '1h' },
  { label: '1 day',   value: '1d' },
  { label: '7 days',  value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'Permanent', value: '-1' },
];

function BanModal({ username, lastIp, onClose }) {
  const [banType, setBanType]     = useState('account');
  const [duration, setDuration]   = useState('7d');
  const [customDur, setCustomDur] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [reason, setReason]       = useState('');
  const [busy, setBusy]           = useState(false);

  const target       = banType === 'account' ? username : (lastIp || '');
  const effectiveDur = useCustom ? customDur.trim() : duration;
  const valid        = target && effectiveDur && reason.trim();

  const handleBan = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.banTarget(banType, target, effectiveDur, reason.trim());
      toast(`${banType === 'account' ? 'Account' : 'IP'} ban applied to ${target}`);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ban — <span className="player-name-em">{username}</span></h3>

        <div className="form-group">
          <label>Ban type</label>
          <div className="ban-type-tabs">
            <button type="button"
              className={`ban-type-tab ${banType === 'account' ? 'active' : ''}`}
              onClick={() => setBanType('account')}>
              Account
            </button>
            <button type="button"
              className={`ban-type-tab ${banType === 'ip' ? 'active' : ''}`}
              onClick={() => setBanType('ip')}
              disabled={!lastIp}>
              IP {lastIp ? `(${lastIp})` : '(no IP on record)'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Duration</label>
          <div className="restart-presets" style={{ marginBottom: 8 }}>
            {BAN_DURATION_PRESETS.map((p) => (
              <button key={p.value} type="button"
                className={`btn btn-secondary btn-xs restart-preset ${!useCustom && duration === p.value ? 'active' : ''}`}
                onClick={() => { setDuration(p.value); setUseCustom(false); }}>
                {p.label}
              </button>
            ))}
            <button type="button"
              className={`btn btn-secondary btn-xs restart-preset ${useCustom ? 'active' : ''}`}
              onClick={() => setUseCustom(true)}>
              Custom
            </button>
          </div>
          {useCustom && (
            <input type="text" value={customDur} onChange={(e) => setCustomDur(e.target.value)}
              placeholder="e.g. 12h, 3d, -1 for permanent" style={{ maxWidth: 220 }} />
          )}
          <small className="type-hint">Use <code>-1</code> for permanent, or e.g. <code>1h</code> / <code>7d</code></small>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for ban" autoFocus />
        </div>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleBan}
            disabled={!valid || busy}>
            {busy ? 'Banning…' : `Ban ${banType === 'account' ? 'Account' : 'IP'}`}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Mute Modal ────────────────────────────────────────────────────────────────
const MUTE_PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '1 day',  minutes: 1440 },
  { label: '7 days', minutes: 10080 },
];

function MuteModal({ characterName, onClose, onMuted }) {
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason]   = useState('');
  const [busy, setBusy]       = useState(false);
  const valid = minutes >= 1 && reason.trim().length > 0;

  const handleMute = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.muteCharacter(characterName, minutes, reason.trim());
      toast(`${characterName} muted for ${minutes} minute(s)`);
      onMuted();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Mute — <span className="player-name-em">{characterName}</span></h3>

        <div className="form-group">
          <label>Duration</label>
          <div className="restart-presets" style={{ marginBottom: 8 }}>
            {MUTE_PRESETS.map((p) => (
              <button key={p.minutes} type="button"
                className={`btn btn-secondary btn-xs restart-preset ${minutes === p.minutes ? 'active' : ''}`}
                onClick={() => setMinutes(p.minutes)}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min="1" value={minutes} style={{ width: 100 }}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))} />
            <span className="td-muted">minutes</span>
          </div>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for mute" autoFocus />
        </div>

        <div className="modal-actions">
          <button className="btn btn-warning" onClick={handleMute} disabled={!valid || busy}>
            {busy ? 'Muting…' : 'Mute Player'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Account Detail Modal ──────────────────────────────────────────────────────
function AccountDetailModal({ account, auth, onClose, onRefresh, onDeleted, onViewCharacter }) {
  const [detail, setDetail]               = useState(account);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showLockConfirm, setShowLockConfirm]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditEmail, setShowEditEmail]         = useState(false);
  const [showBan, setShowBan]                     = useState(false);
  const [muteTarget, setMuteTarget]               = useState(null); // character name
  const [showFlags, setShowFlags]                 = useState(false);
  const [gmBusy, setGmBusy]               = useState(false);
  const [expansionBusy, setExpansionBusy] = useState(false);
  const [lockBusy, setLockBusy]           = useState(false);
  const [pendingFlags, setPendingFlags]   = useState(null); // null = no unsaved changes
  const [flagsBusy, setFlagsBusy]         = useState(false);
  const [races, setRaces]     = useState(FALLBACK_RACES);
  const [classes, setClasses] = useState(FALLBACK_CLASSES);

  useEffect(() => {
    api.getDBCRaces().then(({ races: r }) => {
      if (r && Object.keys(r).length > 0) setRaces(r);
    }).catch(() => {});
    api.getDBCClasses().then(({ classes: c }) => {
      if (c && Object.keys(c).length > 0) setClasses(c);
    }).catch(() => {});
  }, []);

  const canLock  = auth.gmlevel >= 2;
  const canAdmin = auth.gmlevel >= 3;
  const characters = detail.characters || [];

  // GM level change
  const handleGMChange = async (e) => {
    const level = parseInt(e.target.value, 10);
    setGmBusy(true);
    try {
      await api.setGMLevel(detail.id, level);
      setDetail((prev) => ({ ...prev, gmlevel: level }));
      toast(`GM level updated to ${GM_LABELS[level] ?? level} for ${detail.username}`);
      onRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setGmBusy(false);
    }
  };

  // Expansion change
  const handleExpansionChange = async (e) => {
    const expansion = parseInt(e.target.value, 10);
    setExpansionBusy(true);
    try {
      await api.setExpansion(detail.id, expansion);
      setDetail((prev) => ({ ...prev, expansion }));
      toast(`Expansion set to ${EXPANSION_LABELS[expansion] ?? expansion} for ${detail.username}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExpansionBusy(false);
    }
  };

  // Lock / unlock
  const handleLockToggle = async () => {
    if (!detail.locked) { setShowLockConfirm(true); return; }
    setLockBusy(true);
    try {
      await api.setAccountLock(detail.id, false);
      setDetail((prev) => ({ ...prev, locked: false }));
      toast(`Account ${detail.username} unlocked`);
      onRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLockBusy(false);
    }
  };

  const handleConfirmLock = async () => {
    setShowLockConfirm(false);
    setLockBusy(true);
    try {
      await api.setAccountLock(detail.id, true);
      setDetail((prev) => ({ ...prev, locked: true }));
      toast(`Account ${detail.username} locked`);
      onRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLockBusy(false);
    }
  };

  // Delete account
  const handleDelete = async () => {
    try {
      await api.deleteAccount(detail.id);
      toast(`Account ${detail.username} deleted`);
      setShowDeleteConfirm(false);
      onDeleted();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Flags
  const currentFlags = pendingFlags ?? (detail.Flags || 0);

  const handleFlagToggle = (bit) => {
    setPendingFlags((prev) => {
      const cur = prev ?? (detail.Flags || 0);
      return (cur & bit) ? (cur & ~bit) : (cur | bit);
    });
  };

  const handleFlagsSave = async () => {
    if (pendingFlags === null) return;
    setFlagsBusy(true);
    try {
      await api.setAccountFlags(detail.id, pendingFlags);
      setDetail((prev) => ({ ...prev, Flags: pendingFlags }));
      setPendingFlags(null);
      toast(`Account flags updated for ${detail.username}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setFlagsBusy(false);
    }
  };

  // Unmute character
  const handleUnmute = async (charName) => {
    try {
      await api.unmuteCharacter(charName);
      toast(`${charName} unmuted`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Account Details</h3>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
          </div>

          {/* Account Info */}
          <p className="account-section-title">Account Info</p>
          <div className="account-detail-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Username</label>
              <span className="player-name-em" style={{ fontSize: 16 }}>{detail.username}</span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Email</label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{detail.email || '—'}</span>
                {canAdmin && (
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowEditEmail(true)}>
                    Edit
                  </button>
                )}
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Account ID</label>
              <span className="td-muted">{detail.id}</span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Joined</label>
              <span className="td-muted">{fmtUnixFull(detail.joindate)}</span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Last Login</label>
              <span className="td-muted">{fmtUnixFull(detail.last_login)}</span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Last IP</label>
              <span className="td-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {detail.last_ip || '—'}
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>GM Level</label>
              {canAdmin && (detail.gmlevel ?? 0) < 4 ? (
                <select value={detail.gmlevel ?? 0} onChange={handleGMChange}
                  disabled={gmBusy} style={selectStyle}>
                  {[0, 1, 2, 3].map((lvl) => (
                    <option key={lvl} value={lvl}>{GM_LABELS[lvl]}</option>
                  ))}
                </select>
              ) : (
                <span>
                  {(detail.gmlevel ?? 0) >= 1
                    ? <span className="badge badge-warn">{GM_LABELS[detail.gmlevel] ?? detail.gmlevel}</span>
                    : <span className="td-muted">{GM_LABELS[detail.gmlevel ?? 0]}</span>
                  }
                </span>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Expansion</label>
              {canAdmin ? (
                <select value={detail.expansion ?? 2} onChange={handleExpansionChange}
                  disabled={expansionBusy} style={selectStyle}>
                  {Object.entries(EXPANSION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              ) : (
                <span className="td-muted">{EXPANSION_LABELS[detail.expansion ?? 2] ?? detail.expansion}</span>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Status</label>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {detail.online
                  ? <span className="badge badge-info">Online</span>
                  : <span className="badge" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>Offline</span>
                }
                {!!detail.locked && <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>Locked</span>}
              </span>
            </div>
          </div>

          {/* Account Flags */}
          <button className="account-section-title account-section-toggle"
            style={{ marginTop: 20 }} onClick={() => setShowFlags((v) => !v)}>
            Account Flags
            <span className="account-section-chevron">{showFlags ? '▲' : '▼'}</span>
          </button>
          {showFlags && (
            <>
              <div className="account-flags-grid">
                {ACCOUNT_FLAGS.map(({ bit, name, desc }) => {
                  const checked = !!(currentFlags & bit);
                  return (
                    <label key={bit} className={`account-flag-item${checked ? ' account-flag-active' : ''}`}
                      title={desc}>
                      <input type="checkbox" checked={checked}
                        onChange={canAdmin ? () => handleFlagToggle(bit) : undefined}
                        disabled={!canAdmin} />
                      <span className="account-flag-name">{name}</span>
                    </label>
                  );
                })}
              </div>
              {canAdmin && pendingFlags !== null && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary btn-xs" onClick={handleFlagsSave} disabled={flagsBusy}>
                    {flagsBusy ? 'Saving…' : 'Save Flags'}
                  </button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setPendingFlags(null)}>
                    Discard
                  </button>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <p className="account-section-title" style={{ marginTop: 20 }}>Actions</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {canLock && (
              <button className={detail.locked ? 'btn btn-ghost' : 'btn btn-warning'}
                onClick={handleLockToggle} disabled={lockBusy}>
                {lockBusy ? '…' : detail.locked ? 'Unlock Account' : 'Lock Account'}
              </button>
            )}
            {canLock && (
              <button className="btn btn-danger" onClick={() => setShowBan(true)}>
                Ban
              </button>
            )}
            {canAdmin && (
              <>
                <button className="btn btn-danger" onClick={() => setShowResetPassword(true)}>
                  Reset Password
                </button>
                <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Account
                </button>
              </>
            )}
          </div>

          {/* Characters */}
          <p className="account-section-title">Characters</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Race</th>
                  <th>Class</th>
                  <th>Level</th>
                  <th>Playtime</th>
                  <th>Status</th>
                  {canAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {characters.length === 0 ? (
                  <tr>
                    <td colSpan={canAdmin ? 7 : 6} className="empty-cell">No characters on this account</td>
                  </tr>
                ) : (
                  characters.map((c) => (
                    <tr key={c.guid}>
                      <td className="td-name">
                        {onViewCharacter
                          ? <button className="btn-link" onClick={() => onViewCharacter(c.guid)}>{c.name}</button>
                          : c.name}
                      </td>
                      <td>{races[c.race] ?? c.race}</td>
                      <td>{classes[c.class] ?? c.class}</td>
                      <td>{c.level}</td>
                      <td className="td-muted">{fmtPlaytime(c.totaltime)}</td>
                      <td>
                        {c.online
                          ? <span style={{ color: 'var(--green)' }}>● Online</span>
                          : <span className="td-muted">○ Offline</span>
                        }
                      </td>
                      {canAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-warning btn-xs"
                              onClick={() => setMuteTarget(c.name)}>
                              Mute
                            </button>
                            <button className="btn btn-ghost btn-xs"
                              onClick={() => handleUnmute(c.name)}>
                              Unmute
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {showResetPassword && (
        <ResetPasswordModal accountId={detail.id} username={detail.username}
          onClose={() => setShowResetPassword(false)} />
      )}
      {showLockConfirm && (
        <LockConfirmModal username={detail.username} onConfirm={handleConfirmLock}
          onClose={() => setShowLockConfirm(false)} />
      )}
      {showDeleteConfirm && (
        <DeleteAccountModal username={detail.username} onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)} />
      )}
      {showEditEmail && (
        <EditEmailModal accountId={detail.id} currentEmail={detail.email}
          onClose={() => setShowEditEmail(false)}
          onSaved={(email) => setDetail((prev) => ({ ...prev, email }))} />
      )}
      {muteTarget && (
        <MuteModal characterName={muteTarget}
          onClose={() => setMuteTarget(null)}
          onMuted={() => {}} />
      )}
      {showBan && (
        <BanModal
          username={detail.username}
          lastIp={detail.last_ip}
          onClose={() => setShowBan(false)} />
      )}
    </>
  );
}

// ── Create Account Modal ──────────────────────────────────────────────────────
function CreateAccountModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]         = useState(false);

  const passwordsMatch = password === confirm;
  const valid = username.trim() && password.length >= 1 && passwordsMatch;

  const handleCreate = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.createAccount(username.trim(), password);
      toast(`Account "${username.trim()}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Account</h3>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="Username" autoFocus />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} />
          {confirm.length > 0 && !passwordsMatch && (
            <small style={{ color: 'var(--red)' }}>Passwords do not match</small>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleCreate} disabled={!valid || busy}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountsPage({ onViewCharacter }) {
  const { auth } = useAuth();
  const { selectedRealmId } = useServerStatus();
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);

  const canCreateAccount = auth.gmlevel >= 3;

  const doSearch = useCallback(async (q, p = 1) => {
    const term = q ?? query;
    setLoading(true);
    setError('');
    try {
      const data = await api.searchAccounts(term.trim(), p);
      setResults(data.rows);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Load all accounts on mount
  useEffect(() => { doSearch(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewAccount = async (row) => {
    try {
      const detail = await api.getAccount(row.id, selectedRealmId);
      setSelectedAccount(detail);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRefresh = () => {
    if (selectedAccount) {
      api.getAccount(selectedAccount.id, selectedRealmId)
        .then((detail) => setSelectedAccount(detail))
        .catch((err) => toast(err.message, 'error'));
    }
    doSearch(query, page);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Account Management</h2>
          <p className="page-sub">{total > 0 ? `${total} account${total !== 1 ? 's' : ''}` : 'Accounts'} — search by username, email, or IP</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RealmSelector />
          {canCreateAccount && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create Account
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-row">
        <input className="filter-input" type="text"
          placeholder="Search by username, email or IP…"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doSearch(query, 1); }} />
        <button className="btn btn-secondary" onClick={() => doSearch(query, 1)}
          disabled={loading}>
          {loading ? 'Loading…' : 'Search'}
        </button>
      </div>

      {loading ? (
        <div className="loading-text">Loading accounts…</div>
      ) : results.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
          {query.trim() ? <>No accounts match <strong>"{query}"</strong>.</> : 'No accounts found.'}
        </div>
      ) : (
        <>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Last IP</th>
                <th>Last Login</th>
                <th>GM Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td className="td-name">{row.username}</td>
                  <td className="td-muted">{row.email || '—'}</td>
                  <td className="td-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {row.last_ip || '—'}
                  </td>
                  <td className="td-muted">{fmtUnix(row.last_login)}</td>
                  <td>
                    {(row.gmlevel ?? 0) >= 1
                      ? <span className="badge badge-warn">{GM_LABELS[row.gmlevel] ?? row.gmlevel}</span>
                      : <span className="td-muted">{GM_LABELS[row.gmlevel ?? 0]}</span>
                    }
                  </td>
                  <td>
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {row.online
                        ? <span className="badge badge-info">Online</span>
                        : <span className="badge" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>Offline</span>
                      }
                      {!!row.locked && (
                        <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>Locked</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-xs" onClick={() => handleViewAccount(row)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination-row">
            <button className="btn btn-ghost btn-sm" onClick={() => doSearch(query, page - 1)} disabled={page <= 1 || loading}>
              &laquo; Prev
            </button>
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => doSearch(query, page + 1)} disabled={page >= totalPages || loading}>
              Next &raquo;
            </button>
          </div>
        )}
        </>
      )}

      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          auth={auth}
          onClose={() => setSelectedAccount(null)}
          onRefresh={handleRefresh}
          onDeleted={() => { setSelectedAccount(null); doSearch(); }}
          onViewCharacter={onViewCharacter}
        />
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => doSearch()}
        />
      )}
    </div>
  );
}
