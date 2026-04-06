import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { formatUnixDate as fmt } from '../utils/format.js';

// ── Ban modal ────────────────────────────────────────────────────────────────
function BanModal({ onConfirm, onClose }) {
  const [type, setType] = useState('character');
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState('1d');
  const [reason, setReason] = useState('');

  const placeholders = {
    character: 'Character name',
    account:   'Account username',
    ip:        'IP address (e.g. 192.168.1.1)',
  };

  const valid = target.trim() && reason.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Issue Ban</h3>

        <div className="form-group">
          <label>Ban type</label>
          <div className="ban-type-tabs">
            {['character', 'account', 'ip'].map((t) => (
              <button
                key={t}
                type="button"
                className={`ban-type-tab ${type === t ? 'active' : ''}`}
                onClick={() => { setType(t); setTarget(''); }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{type === 'ip' ? 'IP address' : type === 'account' ? 'Account username' : 'Character name'}</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={placeholders[type]}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 1h, 1d, 7d, 30d, -1 for permanent"
          />
          <small>Examples: 1h, 1d, 7d, 30d, -1 for permanent</small>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for ban"
          />
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(type, target.trim(), duration.trim(), reason.trim())}
            disabled={!valid}
          >
            Ban
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Unban confirmation modal ──────────────────────────────────────────────────
function UnbanModal({ label, reason, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Unban <span className="player-name-em">{label}</span>?</h3>
        <p className="modal-detail">Banned for: <em>{reason}</em></p>
        <div className="modal-actions">
          <button className="btn btn-success" onClick={onConfirm}>Unban</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared expiry cell ────────────────────────────────────────────────────────
function ExpiryCell({ permanent, unbandate }) {
  return (
    <td className={permanent ? 'td-perm' : 'td-muted'}>
      {permanent ? 'Permanent' : fmt(unbandate)}
    </td>
  );
}

// ── Tab panels ────────────────────────────────────────────────────────────────
function AccountBansTab({ rows, onUnban }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Account</th><th>Banned by</th><th>Reason</th>
            <th>Banned at</th><th>Expires</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="empty-cell">No active account bans</td></tr>
          ) : rows.map((b) => (
            <tr key={b.id}>
              <td className="td-name">{b.username}</td>
              <td className="td-muted">{b.bannedby}</td>
              <td>{b.banreason}</td>
              <td className="td-muted">{fmt(b.bandate)}</td>
              <ExpiryCell permanent={b.permanent} unbandate={b.unbandate} />
              <td>
                <button className="btn btn-success btn-xs" onClick={() => onUnban(b)}>Unban</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CharacterBansTab({ rows, onUnban }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Character</th><th>Banned by</th><th>Reason</th>
            <th>Banned at</th><th>Expires</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="empty-cell">No active character bans</td></tr>
          ) : rows.map((b) => (
            <tr key={b.guid}>
              <td className="td-name">{b.name}</td>
              <td className="td-muted">{b.bannedby}</td>
              <td>{b.banreason}</td>
              <td className="td-muted">{fmt(b.bandate)}</td>
              <ExpiryCell permanent={b.permanent} unbandate={b.unbandate} />
              <td>
                <button className="btn btn-success btn-xs" onClick={() => onUnban(b)}>Unban</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IpBansTab({ rows, onUnban }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>IP Address</th><th>Banned by</th><th>Reason</th>
            <th>Banned at</th><th>Expires</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="empty-cell">No active IP bans</td></tr>
          ) : rows.map((b) => (
            <tr key={b.ip}>
              <td className="td-name td-mono">{b.ip}</td>
              <td className="td-muted">{b.bannedby}</td>
              <td>{b.banreason}</td>
              <td className="td-muted">{fmt(b.bandate)}</td>
              <ExpiryCell permanent={b.permanent} unbandate={b.unbandate} />
              <td>
                <button className="btn btn-success btn-xs" onClick={() => onUnban(b)}>Unban</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const TABS = ['accounts', 'characters', 'ips'];
const TAB_LABELS = { accounts: 'Account', characters: 'Character', ips: 'IP' };

export default function BansPage() {
  const [data, setData] = useState({ accounts: [], characters: [], ips: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');
  const [showBanModal, setShowBanModal] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState(null); // { type, row }

  const loadBans = useCallback(async () => {
    try {
      const d = await api.getBans();
      setData(d);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBans(); }, [loadBans]);

  const handleBan = async (type, target, duration, reason) => {
    setShowBanModal(false);
    try {
      const result = await api.banTarget(type, target, duration, reason);
      if (result.success === false) {
        toast(result.error || 'Ban command failed', 'error');
      } else {
        toast(`Ban issued: ${type} "${target}" for ${duration}`);
        setTimeout(loadBans, 1500);
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleUnban = async () => {
    const { type, row } = unbanTarget;
    setUnbanTarget(null);
    try {
      if (type === 'accounts')   await api.unbanAccount(row.id);
      if (type === 'characters') await api.unbanCharacter(row.guid);
      if (type === 'ips')        await api.unbanIp(row.ip);

      const label = row.username || row.name || row.ip;
      toast(`Unbanned ${label}`);
      setData((prev) => ({
        ...prev,
        [type]: prev[type].filter((b) =>
          type === 'ips' ? b.ip !== row.ip
          : type === 'characters' ? b.guid !== row.guid
          : b.id !== row.id
        ),
      }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const counts = {
    accounts:   data.accounts.length,
    characters: data.characters.length,
    ips:        data.ips.length,
  };

  const unbanLabel  = unbanTarget ? (unbanTarget.row.username || unbanTarget.row.name || unbanTarget.row.ip) : '';
  const unbanReason = unbanTarget ? unbanTarget.row.banreason : '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Active Bans</h2>
          <p className="page-sub">Manage account, character, and IP bans</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" onClick={() => setShowBanModal(true)}>
            Issue Ban
          </button>
          <button className="btn btn-secondary" onClick={loadBans} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ban-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`ban-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]} Bans
            <span className={`ban-tab-count ${counts[tab] > 0 ? 'has-bans' : ''}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-text">Loading bans…</div>
      ) : (
        <>
          {activeTab === 'accounts'   && <AccountBansTab   rows={data.accounts}   onUnban={(row) => setUnbanTarget({ type: 'accounts', row })} />}
          {activeTab === 'characters' && <CharacterBansTab rows={data.characters} onUnban={(row) => setUnbanTarget({ type: 'characters', row })} />}
          {activeTab === 'ips'        && <IpBansTab        rows={data.ips}        onUnban={(row) => setUnbanTarget({ type: 'ips', row })} />}
        </>
      )}

      {showBanModal && (
        <BanModal onConfirm={handleBan} onClose={() => setShowBanModal(false)} />
      )}

      {unbanTarget && (
        <UnbanModal
          label={unbanLabel}
          reason={unbanReason}
          onConfirm={handleUnban}
          onClose={() => setUnbanTarget(null)}
        />
      )}
    </div>
  );
}
