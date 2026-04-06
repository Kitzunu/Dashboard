const express  = require('express');
const { charPool } = require('../db');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');
const dbc = require('../dbc');

const router = express.Router();

// ── Battleground type name resolution ─────────────────────────────────────────

function bgTypeName(type) {
  return dbc.getBattlegroundName(type) || `BG ${type}`;
}

// ── GET /api/battleground/history ─────────────────────────────────────────────
// List recent battleground matches from pvpstats_battlegrounds
router.get('/history', requireGMLevel(1), async (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit,  10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const bgType = req.query.type ? parseInt(req.query.type, 10) : null;
  const bracket = req.query.bracket ? parseInt(req.query.bracket, 10) : null;

  try {
    let countSql = 'SELECT COUNT(*) AS total FROM pvpstats_battlegrounds';
    let dataSql  = `
      SELECT id, winner_faction, bracket_id, type, date
      FROM pvpstats_battlegrounds
    `;
    const conditions = [];
    const params     = [];

    if (bgType !== null && !isNaN(bgType)) {
      conditions.push('type = ?');
      params.push(bgType);
    }
    if (bracket !== null && !isNaN(bracket)) {
      conditions.push('bracket_id = ?');
      params.push(bracket);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      countSql += where;
      dataSql  += where;
    }

    dataSql += ' ORDER BY date DESC LIMIT ? OFFSET ?';

    const [[{ total }]] = await charPool.query(countSql, params);
    const [rows]        = await charPool.query(dataSql, [...params, limit, offset]);

    // Enrich rows with BG type names from DBC
    const enriched = rows.map((r) => ({ ...r, typeName: bgTypeName(r.type) }));

    res.json({ total, rows: enriched });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ total: 0, rows: [], notice: 'PvP statistics tables not found. Enable CONFIG_BATTLEGROUND_STORE_STATISTICS_ENABLE in worldserver.conf.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/battleground/history/:id ─────────────────────────────────────────
// Get details of a specific match including participating players
router.get('/history/:id', requireGMLevel(1), async (req, res) => {
  const bgId = parseInt(req.params.id, 10);
  if (!bgId) return res.status(400).json({ error: 'Invalid battleground ID' });

  try {
    const [[match]] = await charPool.query(`
      SELECT id, winner_faction, bracket_id, type, date
      FROM pvpstats_battlegrounds
      WHERE id = ?
    `, [bgId]);

    if (!match) return res.status(404).json({ error: 'Battleground match not found' });

    // Enrich with BG type name from DBC
    match.typeName = bgTypeName(match.type);

    const [players] = await charPool.query(`
      SELECT pp.character_guid AS guid,
             c.name, c.class, c.race, c.level,
             pp.winner,
             pp.score_killing_blows AS killingBlows,
             pp.score_deaths        AS deaths,
             pp.score_honorable_kills AS honorableKills,
             pp.score_bonus_honor   AS bonusHonor,
             pp.score_damage_done   AS damageDone,
             pp.score_healing_done  AS healingDone,
             pp.attr_1, pp.attr_2, pp.attr_3, pp.attr_4, pp.attr_5
      FROM pvpstats_players pp
      LEFT JOIN characters c ON pp.character_guid = c.guid
      WHERE pp.battleground_id = ?
      ORDER BY pp.winner DESC, pp.score_damage_done DESC
    `, [bgId]);

    res.json({ ...match, players });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ error: 'PvP statistics tables not found.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/battleground/deserters ───────────────────────────────────────────
// List battleground deserters
router.get('/deserters', requireGMLevel(1), async (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit,  10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    const [[{ total }]] = await charPool.query(
      'SELECT COUNT(*) AS total FROM battleground_deserters'
    );

    const [rows] = await charPool.query(`
      SELECT bd.guid, bd.type, bd.datetime,
             c.name, c.class, c.race, c.level
      FROM battleground_deserters bd
      LEFT JOIN characters c ON bd.guid = c.guid
      ORDER BY bd.datetime DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ total, rows });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ total: 0, rows: [], notice: 'Deserter tracking table not found. This feature requires the mod-deserter-tracker module.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/battleground/deserters/:guid ──────────────────────────────────
// Remove deserter entries for a specific character (GM 2+)
router.delete('/deserters/:guid', requireGMLevel(2), async (req, res) => {
  const guid = parseInt(req.params.guid, 10);
  if (!guid || guid <= 0) return res.status(400).json({ error: 'Invalid character GUID' });

  try {
    const [result] = await charPool.query(
      'DELETE FROM battleground_deserters WHERE guid = ?',
      [guid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No deserter entries found for this character' });
    }

    audit(req, 'battleground.removeDeserter', `guid=${guid} entries=${result.affectedRows}`);
    res.json({ success: true, removed: result.affectedRows });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ error: 'Deserter tracking table not found.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/battleground/stats ──────────────────────────────────────────────
// Get aggregate battleground statistics
router.get('/stats', requireGMLevel(1), async (req, res) => {
  try {
    // Total matches and win distribution by faction
    const [[totals]] = await charPool.query(`
      SELECT COUNT(*) AS totalMatches,
             SUM(CASE WHEN winner_faction = 0 THEN 1 ELSE 0 END) AS allianceWins,
             SUM(CASE WHEN winner_faction = 1 THEN 1 ELSE 0 END) AS hordeWins,
             SUM(CASE WHEN winner_faction NOT IN (0,1) THEN 1 ELSE 0 END) AS draws
      FROM pvpstats_battlegrounds
    `);

    // Per-BG-type breakdown
    const [byType] = await charPool.query(`
      SELECT type,
             COUNT(*) AS matches,
             SUM(CASE WHEN winner_faction = 0 THEN 1 ELSE 0 END) AS allianceWins,
             SUM(CASE WHEN winner_faction = 1 THEN 1 ELSE 0 END) AS hordeWins,
             SUM(CASE WHEN winner_faction NOT IN (0,1) THEN 1 ELSE 0 END) AS draws
      FROM pvpstats_battlegrounds
      GROUP BY type
      ORDER BY matches DESC
    `);

    // Enrich per-type stats with BG names from DBC
    const enrichedByType = byType.map((r) => ({ ...r, typeName: bgTypeName(r.type) }));

    res.json({ ...totals, byType: enrichedByType });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        totalMatches: 0, allianceWins: 0, hordeWins: 0, draws: 0, byType: [],
        notice: 'PvP statistics tables not found.',
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
