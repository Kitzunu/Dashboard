import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_AUCTION_HOUSES } from '../constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUALITY_CLASSES = {
  0: 'quality-poor',
  1: 'quality-common',
  2: 'quality-uncommon',
  3: 'quality-rare',
  4: 'quality-epic',
  5: 'quality-legendary',
  6: 'quality-artifact',
  7: 'quality-heirloom',
};

const QUALITY_LABELS = {
  0: 'Poor',
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
  6: 'Artifact',
  7: 'Heirloom',
};

function MoneyDisplay({ money }) {
  if (!money || money.raw === 0) return <span className="td-muted">—</span>;
  return (
    <span className="money-display">
      {money.gold > 0 && <><span className="money-gold">{money.gold.toLocaleString()}</span><span className="money-label money-g">g</span></>}
      {money.silver > 0 && <><span className="money-silver">{money.silver}</span><span className="money-label money-s">s</span></>}
      {money.copper > 0 && <><span className="money-copper">{money.copper}</span><span className="money-label money-c">c</span></>}
    </span>
  );
}

function AuctionHouseBadge({ name }) {
  const lower = (name || '').toLowerCase();
  const cls = lower.includes('alliance') || lower.includes('stormwind') || lower.includes('darnassus')
    ? 'badge-alliance'
    : lower.includes('horde') || lower.includes('undercity') || lower.includes('thunder bluff')
    ? 'badge-horde'
    : 'badge-neutral';
  return <span className={`badge ${cls}`}>{name}</span>;
}

function timeRemaining(unixTime) {
  const now = Math.floor(Date.now() / 1000);
  const diff = unixTime - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600);
  const mins  = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ auction, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
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
        <h3>Remove Auction #{auction.id}?</h3>
        <p className="modal-detail td-muted">
          {auction.itemName} ×{auction.itemCount} listed by {auction.sellerName}
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Removing…' : 'Confirm Remove'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Stats panel ───────────────────────────────────────────────────────────────

function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <div className="ah-stats">
      <div className="ah-stat-card">
        <div className="ah-stat-value">{stats.totalListings.toLocaleString()}</div>
        <div className="ah-stat-label">Total Listings</div>
      </div>
      <div className="ah-stat-card">
        <div className="ah-stat-value">{stats.uniqueSellers.toLocaleString()}</div>
        <div className="ah-stat-label">Unique Sellers</div>
      </div>
      <div className="ah-stat-card">
        <div className="ah-stat-value">{stats.uniqueBidders.toLocaleString()}</div>
        <div className="ah-stat-label">Active Bidders</div>
      </div>
      <div className="ah-stat-card">
        <div className="ah-stat-value"><MoneyDisplay money={stats.totalBuyoutValue} /></div>
        <div className="ah-stat-label">Total Buyout Value</div>
      </div>
      {Object.entries(stats.houseBreakdown || {}).map(([house, count]) => (
        <div className="ah-stat-card" key={house}>
          <div className="ah-stat-value">{count.toLocaleString()}</div>
          <div className="ah-stat-label">{house}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuctionHousePage({ auth }) {
  const [listings, setListings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [faction, setFaction]         = useState('');
  const [sort, setSort]               = useState('time');
  const [order, setOrder]             = useState('asc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats]             = useState(null);
  const [showStats, setShowStats]     = useState(false);
  const [ahNameMap, setAhNameMap]     = useState({});

  // Fetch DBC auction house names for the filter dropdown
  useEffect(() => {
    api.getDBCAuctionHouses()
      .then(({ auctionhouses }) => {
        if (auctionhouses && Object.keys(auctionhouses).length > 0) {
          const nameMap = {};
          for (const [id, entry] of Object.entries(auctionhouses)) {
            nameMap[id] = entry.name;
          }
          setAhNameMap(nameMap);
        }
      })
      .catch(() => { /* DBC not available, use fallbacks */ });
  }, []);

  const auctionHouseNames = Object.keys(ahNameMap).length > 0 ? ahNameMap : FALLBACK_AUCTION_HOUSES;

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAuctionListings({ page, search, faction, sort, order });
      setListings(data.listings || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setError('');
    } catch (err) {
      setError(err.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, faction, sort, order]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getAuctionStats();
      setStats(data);
    } catch {
      // Stats are optional; silently ignore
    }
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);
  useEffect(() => { if (showStats) loadStats(); }, [showStats, loadStats]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(col);
      setOrder('asc');
    }
    setPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await api.removeAuction(id);
      toast('Auction removed');
      setDeleteTarget(null);
      await loadListings();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const sortIndicator = (col) => {
    if (sort !== col) return '';
    return order === 'asc' ? ' ▲' : ' ▼';
  };

  const canModerate = auth && auth.gmlevel >= 2;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Auction House</h2>
          <p className="page-sub">View and moderate auction house listings ({total.toLocaleString()} total)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowStats((s) => !s)}>
            {showStats ? 'Hide Stats' : 'Stats'}
          </button>
          <button className="btn btn-secondary" onClick={() => { loadListings(); if (showStats) loadStats(); }} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {showStats && <StatsPanel stats={stats} />}

      {/* Filters */}
      <div className="ah-filters">
        <form onSubmit={handleSearch} className="ah-search-form">
          <input
            type="text"
            placeholder="Search by item name or seller…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          {search && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
              Clear
            </button>
          )}
        </form>
        <select value={faction} onChange={(e) => { setFaction(e.target.value); setPage(1); }}>
          <option value="">All Auction Houses</option>
          {Object.entries(auctionHouseNames).map(([id, name]) => (
            <option key={id} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading auctions…</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th className="sortable-th" onClick={() => handleSort('itemEntry')}>
                    Item{sortIndicator('itemEntry')}
                  </th>
                  <th style={{ width: 50 }}>Qty</th>
                  <th>Seller</th>
                  <th style={{ width: 160 }}>Auction House</th>
                  <th className="sortable-th" onClick={() => handleSort('startbid')}>
                    Start Bid{sortIndicator('startbid')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('lastbid')}>
                    Current Bid{sortIndicator('lastbid')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('buyoutprice')}>
                    Buyout{sortIndicator('buyoutprice')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('time')}>
                    Expires{sortIndicator('time')}
                  </th>
                  {canModerate && <th style={{ width: 80 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={canModerate ? 10 : 9} className="empty-cell">
                      No auction listings found
                    </td>
                  </tr>
                ) : (
                  listings.map((a) => (
                    <tr key={a.id}>
                      <td className="td-mono td-muted">{a.id}</td>
                      <td>
                        <span className={QUALITY_CLASSES[a.itemQuality] || ''}>
                          {a.itemName}
                        </span>
                      </td>
                      <td className="td-mono">{a.itemCount}</td>
                      <td className="td-name">{a.sellerName}</td>
                      <td><AuctionHouseBadge name={a.auctionHouseName} /></td>
                      <td><MoneyDisplay money={a.startBid} /></td>
                      <td><MoneyDisplay money={a.lastBid} /></td>
                      <td><MoneyDisplay money={a.buyout} /></td>
                      <td className="td-muted">{timeRemaining(a.expireTime)}</td>
                      {canModerate && (
                        <td>
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => setDeleteTarget(a)}
                          >
                            Remove
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
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(1)}>
                «
              </button>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                ›
              </button>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                »
              </button>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <DeleteModal
          auction={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
