import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { toast } from '../toast.js';

function formatDate(unixSec) {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleString();
}

const TEAM_COLORS = {
  Alliance: 'badge-blue',
  Horde:    'badge-red',
  Both:     'badge-neutral',
};

export default function ChannelsPage() {
  const { auth } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getChannels();
      setChannels(data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (channelId) => {
    setDetailLoading(true);
    try {
      const data = await api.getChannel(channelId);
      setSelected(data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUnban = async (channelId, guid, name) => {
    if (!confirm(`Unban ${name} from this channel?`)) return;
    try {
      await api.unbanChannelPlayer(channelId, guid);
      toast(`Unbanned ${name}`, 'success');
      const data = await api.getChannel(channelId);
      setSelected(data);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDeleteChannel = async (channelId, name) => {
    if (!confirm(`Delete channel "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteChannel(channelId);
      toast(`Channel "${name}" deleted`, 'success');
      setSelected(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const filtered = channels.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.team.toLowerCase().includes(s);
  });

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Chat Channels</h1>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="channels-layout">
        {/* Channel list */}
        <div className="channels-list-panel">
          <div className="channels-search-bar">
            <input
              className="input"
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No channels found.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Team</th>
                    <th style={{ textAlign: 'center' }}>Bans</th>
                    <th style={{ textAlign: 'center' }}>Lock</th>
                    <th>Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.channelId}
                      className={`clickable-row ${selected?.channelId === c.channelId ? 'row-selected' : ''}`}
                      onClick={() => openDetail(c.channelId)}
                    >
                      <td className="channel-name">{c.name}</td>
                      <td>
                        <span className={`badge ${TEAM_COLORS[c.team] || 'badge-neutral'}`}>
                          {c.team}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.banCount > 0
                          ? <span className="badge badge-red">{c.banCount}</span>
                          : <span className="text-dim">0</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.hasPassword
                          ? <span className="channel-lock" title="Password protected">&#128274;</span>
                          : <span className="text-dim">—</span>}
                      </td>
                      <td className="text-dim">{formatDate(c.lastUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="channels-detail-panel">
          {detailLoading && <div className="empty-state">Loading…</div>}

          {!detailLoading && !selected && (
            <div className="empty-state">Select a channel to view details.</div>
          )}

          {!detailLoading && selected && (
            <>
              <div className="channels-detail-header">
                <div>
                  <div className="channels-detail-title">
                    {selected.hasPassword && (
                      <span className="channel-lock" title="Password protected">&#128274;</span>
                    )}{' '}
                    {selected.name}
                  </div>
                  <div className="channels-detail-meta">
                    <span className={`badge ${TEAM_COLORS[selected.team] || 'badge-neutral'}`}>
                      {selected.team}
                    </span>
                    {selected.announce && <span className="badge badge-green">Announce</span>}
                    {selected.ownership && <span className="badge badge-neutral">Ownership</span>}
                    <span className="text-dim">Last used: {formatDate(selected.lastUsed)}</span>
                  </div>
                </div>
                {auth.gmlevel >= 3 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteChannel(selected.channelId, selected.name)}
                  >
                    Delete Channel
                  </button>
                )}
              </div>

              {/* Channel rights config (from channels_rights table, if present) */}
              {selected.rights && (
                <div className="channels-rights-box">
                  <div className="channels-members-title" style={{ marginBottom: 8 }}>Channel Config</div>
                  <div className="channels-rights-grid">
                    {selected.rights.flagLabels.length > 0 && (
                      <div className="channels-rights-row">
                        <span className="text-dim">Restrictions</span>
                        <span className="channels-rights-flags">
                          {selected.rights.flagLabels.map((f) => (
                            <span key={f} className="badge badge-warn">{f}</span>
                          ))}
                        </span>
                      </div>
                    )}
                    {selected.rights.speakdelay > 0 && (
                      <div className="channels-rights-row">
                        <span className="text-dim">Speak Delay</span>
                        <span>{selected.rights.speakdelay}s</span>
                      </div>
                    )}
                    {selected.rights.joinmessage && (
                      <div className="channels-rights-row">
                        <span className="text-dim">Join Message</span>
                        <span>{selected.rights.joinmessage}</span>
                      </div>
                    )}
                    {selected.rights.delaymessage && (
                      <div className="channels-rights-row">
                        <span className="text-dim">Delay Message</span>
                        <span>{selected.rights.delaymessage}</span>
                      </div>
                    )}
                    {selected.rights.moderators && (
                      <div className="channels-rights-row">
                        <span className="text-dim">Moderators</span>
                        <span className="text-dim" style={{ fontSize: 12 }}>{selected.rights.moderators}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Banned players */}
              <div className="channels-members-title">
                Banned Players ({selected.bans.length})
              </div>

              {selected.bans.length === 0 ? (
                <div className="empty-state">No active bans.</div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Character</th>
                        <th>Banned At</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.bans.map((b) => (
                        <tr key={b.guid}>
                          <td>{b.name}</td>
                          <td className="text-dim">{formatDate(b.banTime)}</td>
                          <td>
                            {auth.gmlevel >= 2 && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleUnban(selected.channelId, b.guid, b.name)}
                              >
                                Unban
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
