const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { dashPool, charPool, worldPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// ── Ensure the calendar_events table exists ─────────────────────────────────
let _tableReady = null;
async function ensureTable() {
  if (_tableReady) return _tableReady;
  _tableReady = dashPool.query(`
    CREATE TABLE IF NOT EXISTS \`calendar_events\` (
      \`id\`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      \`title\`       VARCHAR(255)    NOT NULL,
      \`description\` TEXT            DEFAULT NULL,
      \`start\`       DATETIME        NOT NULL,
      \`end\`         DATETIME        NOT NULL,
      \`type\`        ENUM('custom','note') NOT NULL DEFAULT 'custom',
      \`created_by\`  VARCHAR(64)     NOT NULL DEFAULT '',
      \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_start\` (\`start\`),
      KEY \`idx_end\`   (\`end\`),
      KEY \`idx_type\`  (\`type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Dashboard calendar custom events'
  `);
  return _tableReady;
}

// ── GET /api/calendar/events?from=&to= ──────────────────────────────────────
// Returns custom events within a date range
router.get('/events', requireGMLevel(1), async (req, res) => {
  try {
    await ensureTable();
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params are required' });

    const [rows] = await dashPool.query(
      'SELECT * FROM calendar_events WHERE `start` <= ? AND `end` >= ? ORDER BY `start` ASC',
      [to, from]
    );
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/calendar/events ───────────────────────────────────────────────
router.post('/events', requireGMLevel(2), async (req, res) => {
  const { title, description, start, end, type } = req.body;
  if (!title?.trim())   return res.status(400).json({ error: 'Title is required' });
  if (!start || !end)   return res.status(400).json({ error: 'Start and end are required' });
  if (new Date(end) <= new Date(start)) return res.status(400).json({ error: 'End must be after start' });

  const eventType = ['custom', 'note'].includes(type) ? type : 'custom';

  try {
    await ensureTable();
    const [result] = await dashPool.query(
      'INSERT INTO calendar_events (title, description, `start`, `end`, type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), (description || '').trim() || null, start, end, eventType, req.user.username]
    );
    audit(req, 'calendar.create', `id=${result.insertId} title=${title.trim()}`);
    const [[event]] = await dashPool.query('SELECT * FROM calendar_events WHERE id = ?', [result.insertId]);
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/calendar/events/:id ────────────────────────────────────────────
router.put('/events/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, description, start, end, type } = req.body;
  if (!title?.trim())   return res.status(400).json({ error: 'Title is required' });
  if (!start || !end)   return res.status(400).json({ error: 'Start and end are required' });
  if (new Date(end) <= new Date(start)) return res.status(400).json({ error: 'End must be after start' });

  const eventType = ['custom', 'note'].includes(type) ? type : 'custom';

  try {
    await ensureTable();
    const [[existing]] = await dashPool.query('SELECT id FROM calendar_events WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    await dashPool.query(
      'UPDATE calendar_events SET title=?, description=?, `start`=?, `end`=?, type=? WHERE id=?',
      [title.trim(), (description || '').trim() || null, start, end, eventType, id]
    );
    audit(req, 'calendar.update', `id=${id} title=${title.trim()}`);
    const [[event]] = await dashPool.query('SELECT * FROM calendar_events WHERE id = ?', [id]);
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/calendar/events/:id ─────────────────────────────────────────
router.delete('/events/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await ensureTable();
    const [[existing]] = await dashPool.query('SELECT title FROM calendar_events WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    await dashPool.query('DELETE FROM calendar_events WHERE id = ?', [id]);
    audit(req, 'calendar.delete', `id=${id} title=${existing.title}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/calendar/game-events?from=&to= ─────────────────────────────────
// Returns active/upcoming WoW game events from acore_world.game_event
router.get('/game-events', requireGMLevel(1), async (req, res) => {
  try {
    const [rows] = await worldPool.query(
      `SELECT eventEntry, start_time, end_time, occurence, length,
              holiday, description, world_event
       FROM game_event
       WHERE end_time > NOW() OR end_time = '0000-00-00 00:00:00'
       ORDER BY start_time ASC`
    );
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/calendar/ingame-events?from=&to= ───────────────────────────────
// Returns player-created in-game calendar events from acore_characters
router.get('/ingame-events', requireGMLevel(1), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params are required' });

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  try {
    const [rows] = await charPool.query(
      `SELECT ce.id, ce.creator, ce.title, ce.description, ce.type,
              ce.dungeon, ce.eventtime, ce.flags,
              c.name AS creator_name
       FROM calendar_events ce
       LEFT JOIN characters c ON c.guid = ce.creator
       WHERE ce.eventtime BETWEEN ? AND ?
       ORDER BY ce.eventtime ASC`,
      [fromTs, toTs]
    );
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/calendar/raid-resets ────────────────────────────────────────────
// Returns computed raid reset schedule
router.get('/raid-resets', requireGMLevel(1), async (req, res) => {
  // WoW 3.3.5a standard raid instances with weekly lockouts
  const RAIDS = [
    { name: 'Icecrown Citadel',       mapId: 631 },
    { name: 'Trial of the Crusader',   mapId: 649 },
    { name: 'Ulduar',                  mapId: 603 },
    { name: 'Naxxramas',              mapId: 533 },
    { name: 'The Obsidian Sanctum',   mapId: 615 },
    { name: 'The Eye of Eternity',    mapId: 616 },
    { name: 'Vault of Archavon',      mapId: 624 },
    { name: "Onyxia's Lair",          mapId: 249 },
    { name: 'Ruby Sanctum',           mapId: 724 },
  ];

  // Default reset day: Wednesday (EU standard for WoW private servers)
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const resetDay = 3; // Wednesday
  const resetHour = 7; // 07:00 UTC

  function hasPassedResetTime(date, hour) {
    return date.getUTCHours() > hour || (date.getUTCHours() === hour && date.getUTCMinutes() > 0);
  }

  // Compute next 4 weekly resets from now
  const now = new Date();
  const resets = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    const currentDay = d.getUTCDay();
    let daysUntilReset = (resetDay - currentDay + 7) % 7;
    if (i === 0 && daysUntilReset === 0 && hasPassedResetTime(d, resetHour)) {
      daysUntilReset = 7;
    }
    d.setUTCDate(d.getUTCDate() + daysUntilReset + (i * 7));
    d.setUTCHours(resetHour, 0, 0, 0);
    resets.push(d.toISOString());
  }

  res.json({ raids: RAIDS, resets, resetDay, resetHour });
});

module.exports = router;
