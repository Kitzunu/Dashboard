const express  = require('express');
const { charPool } = require('../db');
const { requireGMLevel } = require('../middleware/auth');

const router = express.Router();

// GET /api/arena — list all arena teams with captain name and member count
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [teams] = await charPool.query(`
      SELECT at.arenaTeamId, at.name, at.type, at.captainGuid,
             c.name          AS captainName,
             at.rating, at.seasonGames, at.seasonWins,
             at.weekGames, at.weekWins, at.rank,
             COUNT(atm.guid) AS memberCount
      FROM arena_team at
      LEFT JOIN characters  c   ON at.captainGuid = c.guid
      LEFT JOIN arena_team_member atm ON at.arenaTeamId = atm.arenaTeamId
      GROUP BY at.arenaTeamId
      ORDER BY at.rating DESC
    `);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/arena/:id — full arena team detail with members
router.get('/:id', requireGMLevel(1), async (req, res) => {
  const arenaTeamId = parseInt(req.params.id, 10);
  if (!arenaTeamId) return res.status(400).json({ error: 'Invalid arena team ID' });

  try {
    const [[team]] = await charPool.query(`
      SELECT at.arenaTeamId, at.name, at.type, at.captainGuid,
             c.name AS captainName,
             at.rating, at.seasonGames, at.seasonWins,
             at.weekGames, at.weekWins, at.rank,
             at.BackgroundColor, at.EmblemStyle, at.EmblemColor,
             at.BorderStyle, at.BorderColor
      FROM arena_team at
      LEFT JOIN characters c ON at.captainGuid = c.guid
      WHERE at.arenaTeamId = ?
    `, [arenaTeamId]);

    if (!team) return res.status(404).json({ error: 'Arena team not found' });

    const [members] = await charPool.query(`
      SELECT atm.guid, c.name, c.class, c.level, c.race,
             atm.personalRating,
             atm.weekGames, atm.weekWins,
             atm.seasonGames, atm.seasonWins
      FROM arena_team_member atm
      JOIN characters c ON atm.guid = c.guid
      WHERE atm.arenaTeamId = ?
      ORDER BY atm.personalRating DESC
    `, [arenaTeamId]);

    res.json({ ...team, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
