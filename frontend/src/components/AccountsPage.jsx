import React, { useState, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const RACES = {
  1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead',
  6: 'Tauren', 7: 'Gnome', 8: 'Troll', 10: 'Blood Elf', 11: 'Draenei',
};
const CLASSES = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
  6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid',
};
const GM_LABELS = {
  0: 'Player', 1: 'Moderator', 2: 'Game Master', 3: 'Administrator', 4: 'Console',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtUnix(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleDateString();
}

function fmtUnixFull(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString();
}

function fmtPlaytime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          {password.length > 0 && password.length < 6 && (
            <small style={{ color: 'var(--red)' }}>Password must be at least 6 characters</small>
          )}
        </div>
        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={handleSubmit}
            disabled={!valid || busy}
          >
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

// ── Account Detail Modal ──────────────────────────────────────────────────────
function AccountDetailModal({ account, auth, onClose, onRefresh }) {
  const [detail, setDetail] = useState(account);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [gmBusy, setGmBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const canLock = auth.gmlevel >= 2;
  const canAdmin = auth.gmlevel >= 3;

  const characters = detail.characters || [];

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

  const handleLockToggle = async () => {
    if (!detail.locked) {
      setShowLockConfirm(true);
      return;
    }
    // Unlocking — no confirm needed
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
              <span>{detail.email || '—'}</span>
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
              {canAdmin ? (
                <select
                  value={detail.gmlevel ?? 0}
                  onChange={handleGMChange}
                  disabled={gmBusy}
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 8px' }}
                >
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
              <label>Status</label>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {detail.online
                  ? <span className="badge badge-info">Online</span>
                  : <span className="badge" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>Offline</span>
                }
                {detail.locked && <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>Locked</span>}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {canLock && (
              <button
                className={detail.locked ? 'btn btn-ghost' : 'btn btn-warning'}
                onClick={handleLockToggle}
                disabled={lockBusy}
              >
                {lockBusy ? '…' : detail.locked ? 'Unlock Account' : 'Lock Account'}
              </button>
            )}
            {canAdmin && (
              <button
                className="btn btn-danger"
                onClick={() => setShowResetPassword(true)}
              >
                Reset Password
              </button>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {characters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">No characters on this account</td>
                  </tr>
                ) : (
                  characters.map((c) => (
                    <tr key={c.guid}>
                      <td className="td-name">{c.name}</td>
                      <td>{RACES[c.race] ?? c.race}</td>
                      <td>{CLASSES[c.class] ?? c.class}</td>
                      <td>{c.level}</td>
                      <td>
                        {c.online
                          ? <span style={{ color: 'var(--green)' }}>● Online</span>
                          : <span className="td-muted">○ Offline</span>
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showResetPassword && (
        <ResetPasswordModal
          accountId={detail.id}
          username={detail.username}
          onClose={() => setShowResetPassword(false)}
        />
      )}

      {showLockConfirm && (
        <LockConfirmModal
          username={detail.username}
          onConfirm={handleConfirmLock}
          onClose={() => setShowLockConfirm(false)}
        />
      )}
    </>
  );
}

// ── Create Account Modal ──────────────────────────────────────────────────────
function CreateAccountModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

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
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <small style={{ color: 'var(--red)' }}>Passwords do not match</small>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!valid || busy}
          >
            {busy ? 'Creating…' : 'Create Account'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountsPage({ auth }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const canCreateAccount = auth.gmlevel >= 3;

  const doSearch = useCallback(async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.searchAccounts(term);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  const handleViewAccount = async (row) => {
    try {
      const detail = await api.getAccount(row.id);
      setSelectedAccount(detail);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRefresh = () => {
    if (selectedAccount) {
      api.getAccount(selectedAccount.id)
        .then((detail) => setSelectedAccount(detail))
        .catch((err) => toast(err.message, 'error'));
    }
    if (searched) doSearch();
  };

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Account Management</h2>
          <p className="page-sub">Search by username, email, or IP address</p>
        </div>
        {canCreateAccount && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create Account
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search bar */}
      <div className="filter-row">
        <input
          className="filter-input"
          type="text"
          placeholder="Search username, email or IP…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn btn-secondary"
          onClick={() => doSearch()}
          disabled={loading || !query.trim()}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="loading-text">Searching accounts…</div>
      ) : !searched ? (
        <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
          Enter a search term above to find accounts.
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
          No accounts found for <strong>"{query}"</strong>.
        </div>
      ) : (
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
                      {row.locked && (
                        <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>Locked</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleViewAccount(row)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Account detail modal */}
      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          auth={auth}
          onClose={() => setSelectedAccount(null)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Create account modal */}
      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { if (searched) doSearch(); }}
        />
      )}
    </div>
  );
}
