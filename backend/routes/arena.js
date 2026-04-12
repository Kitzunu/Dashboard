const express  = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { audit } = require('../audit');

const router = express.Router();

// GET /api/arena — list all arena teams with captain name and member count
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [teams] = await req.charPool.query(`
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
    const [[team]] = await req.charPool.query(`
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

    const [members] = await req.charPool.query(`
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
    const [matches] = await req.charPool.query(`
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

// POST /api/arena — create a new arena team (GM 3+)
router.post('/', requireGMLevel(3), async (req, res) => {
  const { name, type, captainGuid } = req.body;

  // Validate name
  if (!name || !name.trim()) return res.status(400).json({ error: 'Team name is required' });
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 24) {
    return res.status(400).json({ error: 'Team name must be between 2 and 24 characters' });
  }

  // Validate bracket type
  const bracketType = parseInt(type, 10);
  if (![2, 3, 5].includes(bracketType)) {
    return res.status(400).json({ error: 'Bracket type must be 2, 3, or 5' });
  }

  // Validate captain
  const captain = parseInt(captainGuid, 10);
  if (!captain || captain <= 0) {
    return res.status(400).json({ error: 'A valid captain character is required' });
  }

  try {
    // Verify captain character exists
    const [[captainChar]] = await req.charPool.query(
      'SELECT guid, name FROM characters WHERE guid = ?',
      [captain]
    );
    if (!captainChar) return res.status(400).json({ error: 'Captain character not found' });

    // Check captain is not already in an arena team of the same type
    const [[existing]] = await req.charPool.query(`
      SELECT atm.arenaTeamId FROM arena_team_member atm
      JOIN arena_team at ON atm.arenaTeamId = at.arenaTeamId
      WHERE atm.guid = ? AND at.type = ?
    `, [captain, bracketType]);
    if (existing) {
      return res.status(400).json({ error: 'Captain is already in a team of this bracket type' });
    }

    // Check name uniqueness
    const [[dup]] = await req.charPool.query(
      'SELECT arenaTeamId FROM arena_team WHERE name = ?',
      [trimmedName]
    );
    if (dup) return res.status(400).json({ error: 'An arena team with that name already exists' });

    // Get next arenaTeamId
    const [[{ nextId }]] = await req.charPool.query(
      'SELECT COALESCE(MAX(arenaTeamId), 0) + 1 AS nextId FROM arena_team'
    );

    // Insert the team
    await req.charPool.query(`
      INSERT INTO arena_team (arenaTeamId, name, captainGuid, type, rating,
        seasonGames, seasonWins, weekGames, weekWins, \`rank\`,
        BackgroundColor, EmblemStyle, EmblemColor, BorderStyle, BorderColor)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [nextId, trimmedName, captain, bracketType]);

    // Add captain as first member
    await req.charPool.query(`
      INSERT INTO arena_team_member (arenaTeamId, guid, weekGames, weekWins,
        seasonGames, seasonWins, personalRating)
      VALUES (?, ?, 0, 0, 0, 0, 0)
    `, [nextId, captain]);

    audit(req, 'arena.create', `arenaTeamId=${nextId} name=${trimmedName} type=${bracketType} captain=${captainChar.name}(${captain})`);
    res.json({ success: true, arenaTeamId: nextId });
  } catch (err) {
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
    const [[member]] = await req.charPool.query(
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
    const details = [];
    if (rating !== undefined) details.push(`rating=${parseInt(rating, 10)}`);
    if (captainGuid !== undefined) details.push(`captainGuid=${parseInt(captainGuid, 10)}`);
    await req.charPool.query(
      `UPDATE arena_team SET ${updates.join(', ')} WHERE arenaTeamId = ?`,
      params
    );
    audit(req, 'arena.update', `arenaTeamId=${arenaTeamId} ${details.join(' ')}`);
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
    const [[team]] = await req.charPool.query(
      'SELECT captainGuid FROM arena_team WHERE arenaTeamId = ?',
      [arenaTeamId]
    );
    if (!team) return res.status(404).json({ error: 'Arena team not found' });
    if (team.captainGuid === guid) {
      return res.status(400).json({ error: 'Cannot remove the team captain. Transfer captainship first.' });
    }

    await req.charPool.query(
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
    const [[team]] = await req.charPool.query(
      'SELECT name FROM arena_team WHERE arenaTeamId = ?',
      [arenaTeamId]
    );
    if (!team) return res.status(404).json({ error: 'Arena team not found' });

    await req.charPool.query('DELETE FROM arena_team_member WHERE arenaTeamId = ?', [arenaTeamId]);
    await req.charPool.query('DELETE FROM arena_team WHERE arenaTeamId = ?', [arenaTeamId]);
    audit(req, 'arena.delete', `arenaTeamId=${arenaTeamId} name=${team.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
