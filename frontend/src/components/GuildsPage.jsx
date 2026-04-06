import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_CLASSES, FALLBACK_RACES, QUALITY_COLORS } from '../constants.js';
import { formatUnixDate as fmt } from '../utils/format.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(copper) {
  if (!copper) return '0g';
  const g = Math.floor(copper / 10000);
  const s = Math.floor((copper % 10000) / 100);
  const c = copper % 100;
  const parts = [];
  if (g) parts.push(`${g}g`);
  if (s) parts.push(`${s}s`);
  if (c || !parts.length) parts.push(`${c}c`);
  return parts.join(' ');
}

// WoW tabard colour palette (indices 0–17)
const TABARD_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#CCCC00', '#80CC00',
  '#008800', '#00AA77', '#009999', '#0077CC', '#0000CC', '#7700CC',
  '#CC00CC', '#CC0077', '#888888', '#CCCCCC', '#F5F5F5', '#8B4513',
];

function tabardColor(index) {
  return TABARD_COLORS[index] ?? '#888888';
}

// Guild event log type descriptions
const EVENT_LABELS = {
  1: (e) => `${e.player2Name ?? '?'} was invited by ${e.player1Name ?? '?'}`,
  2: (e) => `${e.player1Name ?? '?'} joined the guild`,
  3: (e, rankName) => `${e.player2Name ?? '?'} was promoted to ${rankName} by ${e.player1Name ?? '?'}`,
  4: (e, rankName) => `${e.player2Name ?? '?'} was demoted to ${rankName} by ${e.player1Name ?? '?'}`,
  5: (e) => `${e.player2Name ?? '?'} was kicked by ${e.player1Name ?? '?'}`,
  6: (e) => `${e.player1Name ?? '?'} left the guild`,
};

function describeEvent(event, ranks) {
  const fn = EVENT_LABELS[event.EventType];
  if (!fn) return `Unknown event (type ${event.EventType})`;
  const rankName = ranks.find((r) => r.rid === event.NewRank)?.rname ?? `Rank ${event.NewRank}`;
  return fn(event, rankName);
}

// ── Tabard preview ────────────────────────────────────────────────────────────

function TabardPreview({ guild }) {
  return (
    <div className="guild-tabard">
      <div className="guild-tabard-swatch" title="Background">
        <div className="guild-tabard-color" style={{ background: tabardColor(guild.backgroundcolor) }} />
        <span className="guild-tabard-label">BG</span>
      </div>
      <div className="guild-tabard-swatch" title="Border">
        <div className="guild-tabard-color" style={{ background: tabardColor(guild.bordercolor) }} />
        <span className="guild-tabard-label">Border</span>
      </div>
      <div className="guild-tabard-swatch" title="Emblem">
        <div className="guild-tabard-color" style={{ background: tabardColor(guild.emblemcolor) }} />
        <span className="guild-tabard-label">Emblem</span>
      </div>
      <span className="td-muted" style={{ fontSize: 11 }}>
        BG #{guild.backgroundcolor} · Border style {guild.borderstyle} · Emblem style {guild.emblemstyle}
      </span>
    </div>
  );
}

// ── Detail panel tabs ─────────────────────────────────────────────────────────

function MembersTab({ members, onViewCharacter }) {
  if (members.length === 0) return <div className="empty-state">No members.</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th style={{ textAlign: 'center' }}>Level</th>
            <th>Rank</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.guid}>
              <td className="td-name">
                {onViewCharacter
                  ? <button className="btn-link" onClick={() => onViewCharacter(m.guid)}>{m.name}</button>
                  : m.name}
              </td>
              <td className="td-muted">{FALLBACK_CLASSES[m.class] ?? m.class}</td>
              <td style={{ textAlign: 'center' }}>{m.level}</td>
              <td>{m.rankName ?? `Rank ${m.rank}`}</td>
              <td className="td-muted">{m.pnote || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// AzerothCore GuildRankRights bit flags (from guild.h)
const RANK_RIGHTS = [
  { bit: 0x00001, label: 'Chat Listen' },
  { bit: 0x00002, label: 'Chat Speak' },
  { bit: 0x00004, label: 'Officer Chat Listen' },
  { bit: 0x00008, label: 'Officer Chat Speak' },
  { bit: 0x00010, label: 'Invite' },
  { bit: 0x00020, label: 'Remove' },
  { bit: 0x00080, label: 'Promote' },
  { bit: 0x00100, label: 'Demote' },
  { bit: 0x01000, label: 'Set MOTD' },
  { bit: 0x02000, label: 'Edit Public Note' },
  { bit: 0x04000, label: 'View Officer Note' },
  { bit: 0x08000, label: 'Edit Officer Note' },
  { bit: 0x10000, label: 'Edit Guild Info' },
];

function RankPermissions({ rights }) {
  const active = RANK_RIGHTS.filter((r) => rights & r.bit);
  if (active.length === 0) return <span className="td-muted">None</span>;
  return (
    <div className="guild-rank-perms">
      {active.map((r) => (
        <span key={r.bit} className="badge badge-neutral">{r.label}</span>
      ))}
    </div>
  );
}

function RanksTab({ ranks }) {
  if (ranks.length === 0) return <div className="empty-state">No ranks.</div>;
  return (
    <div className="guild-ranks-list">
      {ranks.map((r) => (
        <div key={r.rid} className="guild-rank-row">
          <div className="guild-rank-header">
            <span className="guild-rank-name">{r.rname}</span>
            <span className="td-muted" style={{ fontSize: 12 }}>
              Bank: {formatMoney(r.BankMoneyPerDay)} / day
            </span>
          </div>
          <RankPermissions rights={r.rights} />
        </div>
      ))}
    </div>
  );
}

function EventLogTab({ eventLog, ranks }) {
  if (eventLog.length === 0) return <div className="empty-state">No events recorded.</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
          </tr>
        </thead>
        <tbody>
          {eventLog.map((e, i) => (
            <tr key={i}>
              <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(e.TimeStamp)}</td>
              <td>{describeEvent(e, ranks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// Bank event type labels
const BANK_EVENT_LABELS = {
  1: (e) => `Deposited ${e.itemName ? `${e.ItemStackCount}x ${e.itemName}` : 'item'} in tab ${e.TabId + 1}`,
  2: (e) => `Withdrew ${e.itemName ? `${e.ItemStackCount}x ${e.itemName}` : 'item'} from tab ${e.TabId + 1}`,
  3: (e) => `Moved ${e.itemName ? `${e.ItemStackCount}x ${e.itemName}` : 'item'} from tab ${e.TabId + 1} to tab ${(e.DestTabId ?? 0) + 1}`,
  4: (_e, money) => `Deposited ${money}`,
  5: (_e, money) => `Withdrew ${money}`,
  6: (_e, money) => `Used ${money} for repairs`,
  7: (e) => `Moved ${e.itemName ? `${e.ItemStackCount}x ${e.itemName}` : 'item'}`,
  9: (_e, money) => `Purchased bank tab for ${money}`,
};

function describeBankEvent(e) {
  const fn = BANK_EVENT_LABELS[e.EventType];
  if (!fn) return `Unknown event (type ${e.EventType})`;
  return fn(e, formatMoney(e.ItemOrMoney));
}

function BankEventDescription({ event: e }) {
  const item = { itemEntry: e.ItemOrMoney, name: e.itemName, quality: e.itemQuality };
  const qty  = e.ItemStackCount > 1 ? `${e.ItemStackCount}x ` : '';
  if (e.EventType === 1) return <>{qty}<BankItemLink item={item} /> deposited in tab {e.TabId + 1}</>;
  if (e.EventType === 2) return <>{qty}<BankItemLink item={item} /> withdrawn from tab {e.TabId + 1}</>;
  if (e.EventType === 3 || e.EventType === 7)
    return <>{qty}<BankItemLink item={item} /> moved from tab {e.TabId + 1} to tab {(e.DestTabId ?? 0) + 1}</>;
  return <>{describeBankEvent(e)}</>;
}

function BankItemLink({ item }) {
  return (
    <a
      data-wowhead={`item=${item.itemEntry}&domain=wotlk`}
      href={`https://www.wowhead.com/wotlk/item=${item.itemEntry}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: QUALITY_COLORS[item.quality] ?? '#fff', fontWeight: 500, textDecoration: 'none' }}
    >
      {item.name}
    </a>
  );
}

const BANK_SECTIONS = ['Info', 'Items', 'Item Log', 'Money Log'];

function BankTab({ guildId, bankMoney }) {
  const [bank, setBank]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeItemTab, setActiveItemTab] = useState(0);
  const [section, setSection]     = useState('Info');

  useEffect(() => {
    setLoading(true);
    api.getGuildBank(guildId)
      .then((data) => { setBank(data); setActiveItemTab(data.tabs[0]?.TabId ?? 0); })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [guildId]);

  // Re-initialize WoWHead tooltips after items render
  useEffect(() => {
    if (!loading && bank) window.$WowheadPower?.refreshLinks();
  }, [loading, bank, activeItemTab, section]);

  if (loading) return <div className="empty-state">Loading bank…</div>;
  if (!bank || bank.tabs.length === 0) return <div className="empty-state">No bank tabs.</div>;

  const currentTab = bank.tabs.find((t) => t.TabId === activeItemTab);

  return (
    <div className="guild-bank">
      {/* Section switcher */}
      <div className="guild-bank-tabs">
        {BANK_SECTIONS.map((s) => (
          <button
            key={s}
            className={`guild-bank-tab${section === s ? ' guild-bank-tab-active' : ''}`}
            onClick={() => setSection(s)}
          >
            {s}
            {s === 'Item Log'  && <span className="guild-tab-count">{bank.eventLog.length}</span>}
            {s === 'Money Log' && <span className="guild-tab-count">{bank.moneyLog.length}</span>}
          </button>
        ))}
      </div>

      {/* Info section */}
      {section === 'Info' && (
        <div className="guild-bank-info">
          <div className="guild-rank-row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="guild-info-label">Total Gold</span>
            <span style={{ color: '#e6cc80', fontWeight: 600 }}>{formatMoney(bankMoney)}</span>
          </div>
          {bank.tabs.map((t) => (
            <div key={t.TabId} className="guild-rank-row">
              <div className="guild-rank-header">
                <span className="guild-rank-name">{t.TabName || `Tab ${t.TabId + 1}`}</span>
                <span className="td-muted" style={{ fontSize: 12 }}>{t.items.length} item{t.items.length !== 1 ? 's' : ''}</span>
              </div>
              {t.TabIcon && (
                <div className="td-muted" style={{ fontSize: 12 }}>Icon: {t.TabIcon}</div>
              )}
              {t.TabText && (
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{t.TabText}</div>
              )}
              {!t.TabText && (
                <div className="td-muted" style={{ fontSize: 12 }}>No description set</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items section */}
      {section === 'Items' && (
        <>
          <div className="guild-bank-tabs" style={{ marginTop: 4 }}>
            {bank.tabs.map((t) => (
              <button
                key={t.TabId}
                className={`guild-bank-tab${activeItemTab === t.TabId ? ' guild-bank-tab-active' : ''}`}
                onClick={() => setActiveItemTab(t.TabId)}
              >
                {t.TabName || `Tab ${t.TabId + 1}`}
                <span className="guild-tab-count">{t.items.length}</span>
              </button>
            ))}
          </div>

          {currentTab && (
            <>
              {currentTab.TabText && (
                <p className="td-muted" style={{ fontSize: 12, margin: '4px 0' }}>{currentTab.TabText}</p>
              )}
              {currentTab.items.length === 0 ? (
                <div className="empty-state">This tab is empty.</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'center' }}>Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTab.items.map((item) => (
                        <tr key={item.slotId}>
                          <td><BankItemLink item={item} /></td>
                          <td style={{ textAlign: 'center' }}>{item.count}</td>
                          <td style={{ textAlign: 'center' }} className="td-muted">{item.slotId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Item log section */}
      {section === 'Item Log' && (
        bank.eventLog.length === 0 ? (
          <div className="empty-state">No item log entries.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bank.eventLog.map((e, i) => (
                  <tr key={i}>
                    <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(e.TimeStamp)}</td>
                    <td className="td-name">{e.playerName ?? '—'}</td>
                    <td>
                      {e.itemName ? (
                        <BankEventDescription event={e} />
                      ) : describeBankEvent(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Money log section */}
      {section === 'Money Log' && (
        bank.moneyLog.length === 0 ? (
          <div className="empty-state">No money log entries.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player</th>
                  <th>Action</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bank.moneyLog.map((e, i) => (
                  <tr key={i}>
                    <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(e.TimeStamp)}</td>
                    <td className="td-name">{e.playerName ?? '—'}</td>
                    <td className="td-muted">
                      {e.EventType === 4 ? 'Deposit' : e.EventType === 5 ? 'Withdraw' : e.EventType === 6 ? 'Repair' : e.EventType === 9 ? 'Buy Tab' : `Type ${e.EventType}`}
                    </td>
                    <td style={{ color: e.EventType === 4 ? 'var(--green)' : 'var(--red)' }}>
                      {formatMoney(e.ItemOrMoney)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['Members', 'Ranks', 'Bank', 'Event Log'];

export default function GuildsPage({ onViewCharacter }) {
  const [guilds, setGuilds]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState('Members');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGuilds();
      setGuilds(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (guildId) => {
    setDetailLoading(true);
    setActiveTab('Members');
    try {
      const data = await api.getGuild(guildId);
      setSelected(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = guilds.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(s) ||
      (g.leaderName ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Guilds</h1>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="channels-layout">
        {/* Guild list */}
        <div className="guilds-list-panel">
          <div className="channels-search-bar">
            <input
              className="input"
              placeholder="Search guilds…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No guilds found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Leader</th>
                    <th style={{ textAlign: 'center' }}>Members</th>
                    <th>Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <tr
                      key={g.guildid}
                      className={`clickable-row ${selected?.guildid === g.guildid ? 'row-selected' : ''}`}
                      onClick={() => openDetail(g.guildid)}
                    >
                      <td className="td-name">{g.name}</td>
                      <td className="td-muted">{g.leaderName ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{g.memberCount}</td>
                      <td className="td-muted">{formatMoney(g.BankMoney)}</td>
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
            <div className="empty-state">Select a guild to view details.</div>
          )}

          {!detailLoading && selected && (
            <>
              {/* Header */}
              <div className="channels-detail-header">
                <div>
                  <div className="channels-detail-title">{selected.name}</div>
                  <div className="channels-detail-meta">
                    <span className="td-muted">Leader: <strong>{selected.leaderName ?? '—'}</strong></span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">Founded: {fmt(selected.createdate)}</span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">Bank: {formatMoney(selected.BankMoney)}</span>
                  </div>
                </div>
              </div>

              {/* Tabard */}
              <TabardPreview guild={selected} />

              {/* MOTD / Info */}
              {selected.motd && (
                <div className="guild-info-row">
                  <span className="guild-info-label">MOTD</span>
                  <span>{selected.motd}</span>
                </div>
              )}
              {selected.info && (
                <div className="guild-info-row">
                  <span className="guild-info-label">Info</span>
                  <span>{selected.info}</span>
                </div>
              )}

              {/* Tabs */}
              <div className="guild-tabs">
                {TABS.map((t) => (
                  <button
                    key={t}
                    className={`guild-tab${activeTab === t ? ' guild-tab-active' : ''}`}
                    onClick={() => setActiveTab(t)}
                  >
                    {t}
                    {t === 'Members' && (
                      <span className="guild-tab-count">{selected.members.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'Members'   && <MembersTab  members={selected.members} onViewCharacter={onViewCharacter} />}
              {activeTab === 'Ranks'     && <RanksTab    ranks={selected.ranks} />}
              {activeTab === 'Bank'      && <BankTab     guildId={selected.guildid} bankMoney={selected.BankMoney} />}
              {activeTab === 'Event Log' && <EventLogTab eventLog={selected.eventLog} ranks={selected.ranks} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
