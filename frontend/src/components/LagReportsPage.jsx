import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const LAG_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: '0',   label: 'Loot' },
  { value: '1',   label: 'Auction House' },
  { value: '2',   label: 'Mail' },
  { value: '3',   label: 'Chat' },
  { value: '4',   label: 'Movement' },
  { value: '5',   label: 'Spells & Abilities' },
];

const LAT_PRESETS = [
  { label: 'Any',    value: 0 },
  { label: '≥ 100ms', value: 100 },
  { label: '≥ 250ms', value: 250 },
  { label: '≥ 500ms', value: 500 },
  { label: '≥ 1s',   value: 1000 },
];

// Colour-code latency value
function latencyClass(ms) {
  if (ms >= 500) return 'latency-critical';
  if (ms >= 250) return 'latency-warn';
  if (ms >= 100) return 'latency-ok';
  return 'latency-good';
}

function lagTypeBadgeClass(type) {
  if (type === 0) return 'badge badge-gold';       // Loot
  if (type === 1) return 'badge badge-info';        // Auction House
  if (type === 2) return 'badge badge-success';     // Mail
  if (type === 3) return 'badge badge-dim';         // Chat
  if (type === 4) return 'badge badge-warn';        // Movement
  if (type === 5) return 'badge badge-danger';      // Spells & Abilities
  return 'badge badge-dim';
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="lag-stats-bar">
      <StatPill label="Total"          value={stats.total} />
      <StatPill label="Avg Latency"    value={`${stats.avgLatency} ms`} color={stats.avgLatency >= 250 ? 'warn' : null} />
      <StatPill label="Peak Latency"   value={`${stats.maxLatency} ms`} color={stats.maxLatency >= 500 ? 'red' : stats.maxLatency >= 250 ? 'warn' : null} />
      <StatPill label="Loot"           value={stats.lootCount} />
      <StatPill label="Auction House"  value={stats.ahCount} />
      <StatPill label="Mail"           value={stats.mailCount} />
      <StatPill label="Chat"           value={stats.chatCount} />
      <StatPill label="Movement"       value={stats.movementCount} />
      <StatPill label="Spells"         value={stats.spellCount} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  const style = color === 'warn' ? { color: 'var(--warn)' }
              : color === 'red'  ? { color: 'var(--red)' }
              : {};
  return (
    <div className="lag-stat-pill">
      <span className="lag-stat-label">{label}</span>
      <span className="lag-stat-value" style={style}>{value ?? '—'}</span>
    </div>
  );
}

// ── Top lists panel ───────────────────────────────────────────────────────────
function TopListsPanel({ stats }) {
  if (!stats || (!stats.topChars?.length && !stats.topMaps?.length)) return null;
  return (
    <div className="lag-top-lists">
      {stats.topChars?.length > 0 && (
        <div className="lag-top-block">
          <div className="lag-top-title">Top Reporters</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Character</th>
                <th style={{ textAlign: 'right' }}>Reports</th>
                <th style={{ textAlign: 'right' }}>Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {stats.topChars.map((c) => (
                <tr key={c.guid}>
                  <td>{c.charName || `GUID ${c.guid}`}</td>
                  <td style={{ textAlign: 'right' }}>{c.reports}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={latencyClass(c.avgLat)}>{c.avgLat} ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stats.topMaps?.length > 0 && (
        <div className="lag-top-block">
          <div className="lag-top-title">Most Affected Maps</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Map ID</th>
                <th style={{ textAlign: 'right' }}>Reports</th>
                <th style={{ textAlign: 'right' }}>Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {stats.topMaps.map((m) => (
                <tr key={m.mapId}>
                  <td><MapName id={m.mapId} /></td>
                  <td style={{ textAlign: 'right' }}>{m.reports}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={latencyClass(m.avgLat)}>{m.avgLat} ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Map name lookup (well-known WotLK maps) ───────────────────────────────────
const MAP_NAMES = {
  0:   'Eastern Kingdoms',
  1:   'Kalimdor',
  30:  'Alterac Valley',
  37:  'Azshara Crater',
  43:  'Warsong Gulch',
  44:  'Scarlet Monastery',
  48:  'Blackfathom Deeps',
  70:  'Uldaman',
  90:  'Gnomeregan',
  109: 'Sunken Temple',
  129: 'Razorfen Downs',
  169: 'Arathi Basin',
  189: 'Razorfen Kraul',
  209: 'Zul\'Farrak',
  229: 'Blackrock Spire',
  230: 'Blackrock Depths',
  249: 'Onyxia\'s Lair',
  269: 'Opening Caverns of Time',
  289: 'Scholomance',
  309: 'Zul\'Gurub',
  329: 'Stratholme',
  349: 'Mauradon',
  369: 'Deeprun Tram',
  389: 'Ragefire Chasm',
  409: 'Molten Core',
  429: 'Dire Maul',
  449: 'Alliance PVP Barracks',
  450: 'Horde PVP Barracks',
  469: 'Blackwing Lair',
  489: 'Warsong Gulch',
  509: 'Ruins of Ahn\'Qiraj',
  529: 'Arathi Basin',
  530: 'Outland',
  532: 'Karazhan',
  533: 'Naxxramas',
  534: 'The Battle for Mount Hyjal',
  540: 'The Shattered Halls',
  542: 'The Blood Furnace',
  543: 'Hellfire Ramparts',
  544: 'Magtheridon\'s Lair',
  545: 'The Steamvault',
  546: 'The Underbog',
  547: 'The Slave Pens',
  548: 'Serpentshrine Cavern',
  550: 'The Eye',
  552: 'The Arcatraz',
  553: 'The Botanica',
  554: 'The Mechanar',
  555: 'Shadow Labyrinth',
  556: 'Sethekk Halls',
  557: 'Mana-Tombs',
  558: 'Auchenai Crypts',
  560: 'The Escape from Durnholde',
  562: 'Blade\'s Edge Arena',
  564: 'Black Temple',
  565: 'Gruul\'s Lair',
  566: 'Eye of the Storm',
  568: 'Zul\'Aman',
  571: 'Northrend',
  572: 'Ruins of Lordaeron',
  574: 'Utgrade Keep',
  575: 'Utgarde Pinnacle',
  576: 'The Nexus',
  578: 'The Oculus',
  580: 'The Sunwell',
  582: 'Isle of Conquest (Old)',
  584: 'Isle of Quel\'Danas',
  585: 'Magisters\' Terrace',
  595: 'The Culling of Stratholme',
  598: 'Sunwell Plateau',
  599: 'Halls of Stone',
  600: 'Drak\'Tharon Keep',
  601: 'Azjol-Nerub',
  602: 'Halls of Lightning',
  603: 'Ulduar',
  604: 'Gundrak',
  608: 'Violet Hold',
  615: 'The Obsidian Sanctum',
  616: 'The Eye of Eternity',
  617: 'Dalaran Arena',
  618: 'The Ring of Valor',
  619: 'Ahn\'kahet: The Old Kingdom',
  620: 'Halls of Reflection',
  624: 'Vault of Archavon',
  628: 'Isle of Conquest',
  631: 'Icecrown Citadel',
  632: 'The Forge of Souls',
  641: 'Pit of Saron',
  649: 'Trial of the Crusader',
  650: 'Trial of the Champion',
  658: 'Pit of Saron',
  668: 'Halls of Reflection',
  724: 'The Ruby Sanctum',
};

function MapName({ id }) {
  const name = MAP_NAMES[id];
  if (name) return <span title={`Map ID: ${id}`}>{name}</span>;
  return <span className="td-muted">Map {id}</span>;
}

// ── Clear-all confirmation modal ──────────────────────────────────────────────
function ClearAllModal({ count, onConfirm, onClose, busy }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Clear All Lag Reports</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ marginBottom: 12 }}>
            This will permanently delete all <strong>{count}</strong> lag report{count !== 1 ? 's' : ''} from the database.
          </p>
          <p style={{ color: 'var(--warn)', fontSize: 13 }}>This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Clearing…' : 'Clear All Reports'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LagReportsPage() {
  const { auth } = useAuth();
  const canDelete  = auth.gmlevel >= 2;
  const canClear   = auth.gmlevel >= 3;

  const [reports, setReports]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [lagFilter, setLagFilter]     = useState('all');
  const [minLatency, setMinLatency]   = useState(0);
  const [showTopLists, setShowTopLists] = useState(false);
  const [clearModal, setClearModal]   = useState(false);
  const [clearing, setClearing]       = useState(false);
  const [deletingId, setDeletingId]   = useState(null);

  const fetchReports = useCallback(async (p, lf, ml) => {
    setLoading(true);
    try {
      const data = await api.getLagReports(p, lf, ml);
      setReports(data.reports);
      setTotalPages(data.pages);
      setTotalCount(data.total);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await api.getLagStats();
      setStats(s);
    } catch {
      // stats are optional — don't toast
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(page, lagFilter, minLatency);
  }, [page, lagFilter, minLatency, fetchReports]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLagFilterChange = (val) => { setLagFilter(val); setPage(1); };
  const handleMinLatChange    = (val) => { setMinLatency(val); setPage(1); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await api.deleteLagReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setTotalCount((c) => c - 1);
      if (stats) setStats((s) => ({ ...s, total: s.total - 1 }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const result = await api.clearLagReports();
      toast(`Cleared ${result.deleted} lag report${result.deleted !== 1 ? 's' : ''}`);
      setReports([]);
      setTotalCount(0);
      setTotalPages(1);
      setPage(1);
      setStats((s) => s ? { ...s, total: 0, avgLatency: 0, maxLatency: 0, worldCount: 0, chatCount: 0, topChars: [], topMaps: [] } : s);
      setClearModal(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Lag Reports</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setShowTopLists((v) => !v)}
          >
            {showTopLists ? '▲ Hide Stats' : '▼ Show Stats'}
          </button>
          {canClear && totalCount > 0 && (
            <button className="btn btn-danger btn-xs" onClick={() => setClearModal(true)}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Summary pills */}
      {!statsLoading && <StatsBar stats={stats} />}

      {/* Top lists (collapsible) */}
      {showTopLists && <TopListsPanel stats={stats} />}

      {/* Filters */}
      <div className="lag-filters">
        <div className="tab-row">
          {LAG_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`tab-btn${lagFilter === opt.value ? ' active' : ''}`}
              onClick={() => handleLagFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="lag-latency-filter">
          <span className="filter-label">Min latency:</span>
          {LAT_PRESETS.map((p) => (
            <button
              key={p.value}
              className={`tab-btn${minLatency === p.value ? ' active' : ''}`}
              onClick={() => handleMinLatChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <div className="lag-result-count">
        {!loading && (
          <span className="td-muted">
            {totalCount} report{totalCount !== 1 ? 's' : ''}
            {(lagFilter !== 'all' || minLatency > 0) ? ' (filtered)' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 110 }}>Type</th>
              <th>Character</th>
              <th>Map</th>
              <th>Coordinates</th>
              <th style={{ width: 110 }}>Latency</th>
              <th>Date</th>
              {canDelete && <th style={{ width: 80 }}></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canDelete ? 8 : 7} className="table-empty">Loading…</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={canDelete ? 8 : 7} className="table-empty">No lag reports found.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="data-row">
                  <td className="td-muted mono">{r.id}</td>
                  <td><span className={lagTypeBadgeClass(r.lagType)}>{r.lagTypeLabel}</span></td>
                  <td>{r.character}</td>
                  <td><MapName id={r.mapId} /></td>
                  <td className="td-muted mono" style={{ fontSize: 12 }}>
                    {r.posX}, {r.posY}, {r.posZ}
                  </td>
                  <td>
                    <span className={`latency-badge ${latencyClass(r.latency)}`}>
                      {r.latency} ms
                    </span>
                  </td>
                  <td className="td-muted" style={{ fontSize: 12 }}>
                    {r.createTime ?? '—'}
                  </td>
                  {canDelete && (
                    <td>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => handleDelete(r.id, e)}
                        disabled={deletingId === r.id}
                      >
                        {deletingId === r.id ? '…' : 'Dismiss'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Prev
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      )}

      {/* Clear all modal */}
      {clearModal && (
        <ClearAllModal
          count={totalCount}
          onConfirm={handleClearAll}
          onClose={() => setClearModal(false)}
          busy={clearing}
        />
      )}
    </div>
  );
}
