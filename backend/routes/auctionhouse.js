const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool, worldPool } = require('../db');
const { audit } = require('../audit');
const dbc = require('../dbc');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────

/**
 * Hardcoded fallback when AuctionHouse.dbc is not available.
 * IDs match AuctionHouse.dbc entries (WotLK 3.3.5a).
 */
const FALLBACK_HOUSES = {
  1: 'Stormwind Auction House',
  2: 'Alliance Auction House',
  3: 'Darnassus Auction House',
  4: 'Undercity Auction House',
  5: 'Thunder Bluff Auction House',
  6: 'Horde Auction House',
  7: 'Blackwater Auction House',
};

/** Resolve auction house name from DBC or fallback. */
function auctionHouseName(houseId) {
  const dbcEntry = dbc.getAuctionHouse(houseId);
  if (dbcEntry) return dbcEntry.name;
  return FALLBACK_HOUSES[houseId] || `Auction House #${houseId}`;
}

/**
 * Resolve house IDs matching a given filter string.
 * Uses DBC data when available, falls back to hardcoded mapping.
 */
function houseIdsForFilter(filterName) {
  const allHouses = dbc.getAllAuctionHouses();
  if (Object.keys(allHouses).length > 0) {
    const lower = filterName.toLowerCase();
    return Object.entries(allHouses)
      .filter(([, h]) => h.name.toLowerCase().includes(lower))
      .map(([id]) => Number(id));
  }
  return Object.entries(FALLBACK_HOUSES)
    .filter(([, name]) => name === filterName)
    .map(([id]) => Number(id));
}

/** Break a copper value into gold / silver / copper. */
function formatMoney(copper) {
  const c = copper || 0;
  const gold   = Math.floor(c / 10000);
  const silver = Math.floor((c % 10000) / 100);
  const cop    = c % 100;
  return { gold, silver, copper: cop, raw: c };
}

// ── GET / — list auctions with optional search, pagination & filters ──
//
// auctionhouse columns (per AC wiki):
//   id, houseid, itemguid, itemowner, buyoutprice, time, buyguid,
//   lastbid, startbid, deposit
//
// Item details (itemEntry, count) come from joining item_instance.

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset   = (page - 1) * limit;
    const search   = (req.query.search || '').trim();
    const faction  = (req.query.faction || '').trim();
    const sort     = (req.query.sort || 'time').trim();
    const order    = (req.query.order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const ALLOWED_SORTS = ['time', 'buyoutprice', 'startbid', 'lastbid'];
    const safeSort = ALLOWED_SORTS.includes(sort) ? sort : 'time';

    // ── Build WHERE conditions (characters-DB only) ──
    const conditions = [];
    const params     = [];

    if (faction) {
      const houseIds = houseIdsForFilter(faction);
      if (houseIds.length > 0) {
        conditions.push(`a.houseid IN (${houseIds.map(() => '?').join(',')})`);
        params.push(...houseIds);
      }
    }

    if (search) {
      conditions.push('seller.name LIKE ?');
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const [[{ total }]] = await charPool.query(
      `SELECT COUNT(*) AS total
       FROM auctionhouse a
       LEFT JOIN characters seller ON seller.guid = a.itemowner
       ${where}`,
      params
    );

    // Fetch page — join item_instance to get itemEntry and count
    const [rows] = await charPool.query(
      `SELECT
         a.id, a.houseid, a.itemguid,
         ii.itemEntry, ii.count AS itemCount,
         a.itemowner   AS sellerGuid,
         seller.name   AS sellerName,
         a.buyguid,
         buyer.name    AS buyerName,
         a.startbid, a.lastbid, a.buyoutprice,
         a.time        AS expireTime,
         a.deposit
       FROM auctionhouse a
       LEFT JOIN item_instance ii   ON ii.guid    = a.itemguid
       LEFT JOIN characters seller  ON seller.guid = a.itemowner
       LEFT JOIN characters buyer   ON buyer.guid  = a.buyguid
       ${where}
       ORDER BY a.\`${safeSort}\` ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // ── Resolve item names / quality from world DB (separate query) ──
    const itemEntries = [...new Set(rows.map((r) => r.itemEntry).filter(Boolean))];
    let itemMap = {};
    if (itemEntries.length > 0) {
      const [items] = await worldPool.query(
        'SELECT entry, name, Quality FROM item_template WHERE entry IN (?)',
        [itemEntries]
      );
      itemMap = Object.fromEntries(items.map((i) => [i.entry, i]));
    }

    // If search is active, post-filter to also match item names (item_template
    // lives in a different DB so it cannot be part of the SQL WHERE).
    let filtered = rows;
    if (search) {
      const lower = search.toLowerCase();
      filtered = rows.filter((r) => {
        const tpl = itemMap[r.itemEntry];
        const itemName = tpl ? tpl.name : '';
        return r.sellerName?.toLowerCase().includes(lower) || itemName.toLowerCase().includes(lower);
      });
    }

    const listings = filtered.map((r) => {
      const tpl = itemMap[r.itemEntry] ?? {};
      return {
        id:               r.id,
        houseId:          r.houseid,
        auctionHouseName: auctionHouseName(r.houseid),
        itemGuid:         r.itemguid,
        itemEntry:        r.itemEntry,
        itemName:         tpl.name || `Item #${r.itemEntry || '?'}`,
        itemQuality:      tpl.Quality ?? 0,
        itemCount:        r.itemCount ?? 1,
        sellerGuid:       r.sellerGuid,
        sellerName:       r.sellerName || 'Unknown',
        buyerName:        r.buyerName || null,
        startBid:         formatMoney(r.startbid),
        lastBid:          formatMoney(r.lastbid),
        buyout:           formatMoney(r.buyoutprice),
        deposit:          formatMoney(r.deposit),
        expireTime:       r.expireTime,
      };
    });

    res.json({
      listings,
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /stats — summary statistics ───────────────────────────────

router.get('/stats', requireGMLevel(1), async (req, res) => {
  try {
    const [[stats]] = await charPool.query(`
      SELECT
        COUNT(*)                                AS totalListings,
        COALESCE(SUM(buyoutprice), 0)           AS totalBuyoutValue,
        COALESCE(SUM(deposit), 0)               AS totalDeposits,
        COUNT(DISTINCT itemowner)               AS uniqueSellers,
        COUNT(DISTINCT CASE WHEN buyguid > 0 THEN buyguid END) AS uniqueBidders
      FROM auctionhouse
    `);

    const [houseRows] = await charPool.query(`
      SELECT houseid, COUNT(*) AS count
      FROM auctionhouse
      GROUP BY houseid
    `);

    const houseBreakdown = {};
    for (const row of houseRows) {
      const name = auctionHouseName(row.houseid);
      houseBreakdown[name] = (houseBreakdown[name] || 0) + Number(row.count);
    }

    res.json({
      totalListings:    Number(stats.totalListings),
      totalBuyoutValue: formatMoney(Number(stats.totalBuyoutValue)),
      totalDeposits:    formatMoney(Number(stats.totalDeposits)),
      uniqueSellers:    Number(stats.uniqueSellers),
      uniqueBidders:    Number(stats.uniqueBidders),
      houseBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id — remove an auction listing (moderation) ──────────

router.delete('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid auction ID' });

  try {
    // Fetch auction details for audit log before deletion
    const [[auction]] = await charPool.query(
      `SELECT a.id, ii.itemEntry, a.itemowner
       FROM auctionhouse a
       LEFT JOIN item_instance ii ON ii.guid = a.itemguid
       WHERE a.id = ?`,
      [id]
    );
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    await charPool.query('DELETE FROM auctionhouse WHERE id = ?', [id]);

    audit(req, 'auctionhouse.remove', `auctionId=${id} itemEntry=${auction.itemEntry} seller=${auction.itemowner}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
