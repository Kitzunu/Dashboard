const express  = require('express');
const { charPool } = require('../db');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');

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
      GROUP BY at.arenaTeamId, at.name, at.type, at.captainGuid,
               c.name, at.rating, at.seasonGames, at.seasonWins,
               at.weekGames, at.weekWins, at.rank
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

// GET /api/arena/:id/matches — match history for an arena team
router.get('/:id/matches', requireGMLevel(1), async (req, res) => {
  const arenaTeamId = parseInt(req.params.id, 10);
  if (!arenaTeamId) return res.status(400).json({ error: 'Invalid arena team ID' });

  try {
    // character_arena_stats stores per-character per-slot match logs
    // We try to get the match history; the table may not exist on all cores
    const [matches] = await charPool.query(`
      SELECT cs.guid, c.name AS charName, c.class, c.race,
             cs.matchMakerRating, cs.maxMMR,
             cs.slot
      FROM character_arena_stats cs
      JOIN characters c ON cs.guid = c.guid
      JOIN arena_team_member atm ON cs.guid = atm.guid AND atm.arenaTeamId = ?
      WHERE cs.slot = (
        SELECT CASE at2.type WHEN 2 THEN 0 WHEN 3 THEN 1 WHEN 5 THEN 2 ELSE 0 END
        FROM arena_team at2 WHERE at2.arenaTeamId = ?
      )
      ORDER BY cs.matchMakerRating DESC
    `, [arenaTeamId, arenaTeamId]);

    res.json(matches);
  } catch (err) {
    // Table may not exist — return empty array rather than error
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/arena/:id — update arena team (rating, captain) (GM 3+)
router.patch('/:id', requireGMLevel(3), async (req, res) => {
  const arenaTeamId = parseInt(req.params.id, 10);
  if (!arenaTeamId) return res.status(400).json({ error: 'Invalid arena team ID' });

  const { rating, captainGuid } = req.body;
  const updates = [];
  const params  = [];

  if (rating !== undefined) {
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 0) return res.status(400).json({ error: 'Invalid rating' });
    updates.push('rating = ?');
    params.push(r);
  }

  if (captainGuid !== undefined) {
    const g = parseInt(captainGuid, 10);
    if (isNaN(g) || g <= 0) return res.status(400).json({ error: 'Invalid captain GUID' });
    // Verify the new captain is a member of the team
    const [[member]] = await charPool.query(
      'SELECT guid FROM arena_team_member WHERE arenaTeamId = ? AND guid = ?',
      [arenaTeamId, g]
    );
    if (!member) return res.status(400).json({ error: 'New captain must be a member of the team' });
    updates.push('captainGuid = ?');
    params.push(g);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  params.push(arenaTeamId);

  try {
    await charPool.query(
      `UPDATE arena_team SET ${updates.join(', ')} WHERE arenaTeamId = ?`,
      params
    );
    audit(req, 'arena.update', `arenaTeamId=${arenaTeamId} ${updates.join(' ')}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/arena/:id/members/:guid — remove a member from an arena team (GM 2+)
router.delete('/:id/members/:guid', requireGMLevel(2), async (req, res) => {
  const arenaTeamId = parseInt(req.params.id, 10);
  const guid        = parseInt(req.params.guid, 10);
  if (!arenaTeamId || !guid) return res.status(400).json({ error: 'Invalid parameters' });

  try {
    // Don't allow removing the captain — they must disband or transfer first
    const [[team]] = await charPool.query(
      'SELECT captainGuid FROM arena_team WHERE arenaTeamId = ?',
      [arenaTeamId]
    );
    if (!team) return res.status(404).json({ error: 'Arena team not found' });
    if (team.captainGuid === guid) {
      return res.status(400).json({ error: 'Cannot remove the team captain. Transfer captainship first.' });
    }

    await charPool.query(
      'DELETE FROM arena_team_member WHERE arenaTeamId = ? AND guid = ?',
      [arenaTeamId, guid]
    );
    audit(req, 'arena.removeMember', `arenaTeamId=${arenaTeamId} guid=${guid}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/arena/:id — delete an arena team and its members (GM 3+)
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const arenaTeamId = parseInt(req.params.id, 10);
  if (!arenaTeamId) return res.status(400).json({ error: 'Invalid arena team ID' });

  try {
    // Get team name for audit log before deleting
    const [[team]] = await charPool.query(
      'SELECT name FROM arena_team WHERE arenaTeamId = ?',
      [arenaTeamId]
    );
    if (!team) return res.status(404).json({ error: 'Arena team not found' });

    await charPool.query('DELETE FROM arena_team_member WHERE arenaTeamId = ?', [arenaTeamId]);
    await charPool.query('DELETE FROM arena_team WHERE arenaTeamId = ?', [arenaTeamId]);
    audit(req, 'arena.delete', `arenaTeamId=${arenaTeamId} name=${team.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
