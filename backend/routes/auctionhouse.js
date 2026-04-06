const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool, worldPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────

/** Map houseid to faction names (AzerothCore conventions). */
function factionFromHouseId(houseId) {
  switch (houseId) {
    case 2:  return 'Alliance';
    case 6:  return 'Horde';
    case 1:
    case 7:  return 'Neutral';
    default: return 'Unknown';
  }
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

router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset   = (page - 1) * limit;
    const search   = (req.query.search || '').trim();
    const faction  = (req.query.faction || '').trim();
    const sort     = (req.query.sort || 'time').trim();
    const order    = (req.query.order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const ALLOWED_SORTS = ['time', 'buyoutprice', 'startbid', 'lastbid', 'itemEntry'];
    const safeSort = ALLOWED_SORTS.includes(sort) ? sort : 'time';

    // ── Build WHERE conditions (characters-DB only) ──
    const conditions = [];
    const params     = [];

    if (faction) {
      const houseIds = [];
      if (faction === 'Alliance') houseIds.push(2);
      else if (faction === 'Horde') houseIds.push(6);
      else if (faction === 'Neutral') houseIds.push(1, 7);
      if (houseIds.length > 0) {
        conditions.push(`a.houseid IN (${houseIds.map(() => '?').join(',')})`);
        params.push(...houseIds);
      }
    }

    if (search) {
      // Seller name search (characters DB)
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

    // Fetch page
    const [rows] = await charPool.query(
      `SELECT
         a.id, a.houseid, a.itemguid, a.itemEntry,
         a.count       AS itemCount,
         a.itemowner   AS sellerGuid,
         seller.name   AS sellerName,
         a.buyguid,
         buyer.name    AS buyerName,
         a.startbid, a.lastbid, a.buyoutprice,
         a.time        AS expireTime,
         a.deposit
       FROM auctionhouse a
       LEFT JOIN characters seller ON seller.guid = a.itemowner
       LEFT JOIN characters buyer  ON buyer.guid  = a.buyguid
       ${where}
       ORDER BY a.\`${safeSort}\` ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // ── Resolve item names / quality from world DB (separate query) ──
    const itemEntries = [...new Set(rows.map((r) => r.itemEntry))];
    let itemMap = {};
    if (itemEntries.length > 0) {
      const [items] = await worldPool.query(
        'SELECT entry, name, Quality FROM item_template WHERE entry IN (?)',
        [itemEntries]
      );
      itemMap = Object.fromEntries(items.map((i) => [i.entry, i]));
    }

    // If we have an item-name search, do a post-filter (item_template lives in
    // a different DB so we cannot use it in the main WHERE).
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
        id:          r.id,
        houseId:     r.houseid,
        faction:     factionFromHouseId(r.houseid),
        itemGuid:    r.itemguid,
        itemEntry:   r.itemEntry,
        itemName:    tpl.name || `Item #${r.itemEntry}`,
        itemQuality: tpl.Quality ?? 0,
        itemCount:   r.itemCount,
        sellerGuid:  r.sellerGuid,
        sellerName:  r.sellerName || 'Unknown',
        buyerName:   r.buyerName || null,
        startBid:    formatMoney(r.startbid),
        lastBid:     formatMoney(r.lastbid),
        buyout:      formatMoney(r.buyoutprice),
        deposit:     formatMoney(r.deposit),
        expireTime:  r.expireTime,
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

    const [factionRows] = await charPool.query(`
      SELECT houseid, COUNT(*) AS count
      FROM auctionhouse
      GROUP BY houseid
    `);

    const factionBreakdown = {};
    for (const row of factionRows) {
      const name = factionFromHouseId(row.houseid);
      factionBreakdown[name] = (factionBreakdown[name] || 0) + Number(row.count);
    }

    res.json({
      totalListings:    Number(stats.totalListings),
      totalBuyoutValue: formatMoney(Number(stats.totalBuyoutValue)),
      totalDeposits:    formatMoney(Number(stats.totalDeposits)),
      uniqueSellers:    Number(stats.uniqueSellers),
      uniqueBidders:    Number(stats.uniqueBidders),
      factionBreakdown,
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
    const [[auction]] = await charPool.query(
      'SELECT id, itemEntry, itemowner, buyoutprice FROM auctionhouse WHERE id = ?',
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
