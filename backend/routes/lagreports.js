const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const dbc = require('../dbc');

const router = express.Router();

const PAGE_SIZE = 50;

// Lag type labels from WoW client CMSG_REPORT_LAG
const LAG_TYPES = {
  0: 'Loot',
  1: 'Auction House',
  2: 'Mail',
  3: 'Chat',
  4: 'Movement',
  5: 'Spells & Abilities',
};

function lagTypeLabel(n) {
  return LAG_TYPES[n] ?? `Type ${n}`;
}

// Format Unix timestamp to ISO-style date string
function fmtTime(unixSec) {
  if (!unixSec) return null;
  return new Date(unixSec * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

// GET /api/lagreports?page=1&lagType=all&minLatency=0
router.get('/', requireGMLevel(1), async (req, res) => {
  const page       = Math.max(1, parseInt(req.query.page, 10) || 1);
  const lagFilter  = req.query.lagType;   // '0', '1', or omitted/all
  const minLat     = parseInt(req.query.minLatency, 10) || 0;
  const offset     = (page - 1) * PAGE_SIZE;

  const conditions = [];
  const params     = [];

  if (lagFilter !== undefined && lagFilter !== 'all' && lagFilter !== '') {
    conditions.push('lr.lagType = ?');
    params.push(parseInt(lagFilter, 10));
  }
  if (minLat > 0) {
    conditions.push('lr.latency >= ?');
    params.push(minLat);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [[{ total }]] = await req.charPool.query(
      `SELECT COUNT(*) AS total FROM lag_reports lr ${where}`,
      params
    );

    const [rows] = await req.charPool.query(
      `SELECT lr.reportId, lr.guid, c.name AS charName,
              lr.lagType, lr.mapId,
              lr.posX, lr.posY, lr.posZ,
              lr.latency, lr.createTime
       FROM lag_reports lr
       LEFT JOIN characters c ON c.guid = lr.guid
       ${where}
       ORDER BY lr.reportId DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const reports = rows.map((r) => ({
      id:          r.reportId,
      guid:        r.guid,
      character:   r.charName || `GUID ${r.guid}`,
      lagType:     r.lagType,
      lagTypeLabel: lagTypeLabel(r.lagType),
      mapId:       r.mapId,
      mapName:     dbc.getMapName(r.mapId),
      posX:        parseFloat(r.posX.toFixed(2)),
      posY:        parseFloat(r.posY.toFixed(2)),
      posZ:        parseFloat(r.posZ.toFixed(2)),
      latency:     r.latency,
      createTime:  fmtTime(r.createTime),
      createTimeRaw: r.createTime,
    }));

    res.json({ reports, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lagreports/stats — aggregate summary
router.get('/stats', requireGMLevel(1), async (req, res) => {
  try {
    const [[stats]] = await req.charPool.query(
      `SELECT COUNT(*)                                         AS total,
              ROUND(AVG(latency))                             AS avgLatency,
              MAX(latency)                                    AS maxLatency,
              SUM(lagType = 0)                                AS lootCount,
              SUM(lagType = 1)                                AS ahCount,
              SUM(lagType = 2)                                AS mailCount,
              SUM(lagType = 3)                                AS chatCount,
              SUM(lagType = 4)                                AS movementCount,
              SUM(lagType = 5)                                AS spellCount
       FROM lag_reports`
    );

    // Top 5 most-reporting characters
    const [topChars] = await req.charPool.query(
      `SELECT c.name AS charName, lr.guid, COUNT(*) AS reports, ROUND(AVG(lr.latency)) AS avgLat
       FROM lag_reports lr
       LEFT JOIN characters c ON c.guid = lr.guid
       GROUP BY lr.guid
       ORDER BY reports DESC
       LIMIT 5`
    );

    // Top 5 most-affected maps
    const [topMaps] = await req.charPool.query(
      `SELECT mapId, COUNT(*) AS reports, ROUND(AVG(latency)) AS avgLat
       FROM lag_reports
       GROUP BY mapId
       ORDER BY reports DESC
       LIMIT 5`
    );

    res.json({
      total:         Number(stats.total),
      avgLatency:    Number(stats.avgLatency) || 0,
      maxLatency:    Number(stats.maxLatency) || 0,
      lootCount:     Number(stats.lootCount),
      ahCount:       Number(stats.ahCount),
      mailCount:     Number(stats.mailCount),
      chatCount:     Number(stats.chatCount),
      movementCount: Number(stats.movementCount),
      spellCount:    Number(stats.spellCount),
      topChars:    topChars.map((r) => ({ ...r, reports: Number(r.reports), avgLat: Number(r.avgLat) })),
      topMaps:     topMaps.map((r) => ({ ...r, reports: Number(r.reports), avgLat: Number(r.avgLat), mapName: dbc.getMapName(r.mapId) })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/lagreports/:id — dismiss a single report (gm2+)
router.delete('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await req.charPool.query('DELETE FROM lag_reports WHERE reportId = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/lagreports — clear all reports (gm3+)
router.delete('/', requireGMLevel(3), async (req, res) => {
  try {
    const [result] = await req.charPool.query('DELETE FROM lag_reports');
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
