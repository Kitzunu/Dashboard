const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

// TeamId enum: 0 = Alliance, 1 = Horde, 2 = Neutral (cross-faction / Both)
const TEAM_LABELS = { 0: 'Alliance', 1: 'Horde', 2: 'Both' };

// channels_rights.flags bitmask (channel-wide settings, keyed by channel name)
const CR = {
  FORCE_NO_ANNOUNCEMENTS: 0x001,
  FORCE_ANNOUNCEMENTS:    0x002,
  NO_OWNERSHIP:           0x004,
  CANT_SPEAK:             0x008,
  CANT_BAN:               0x010,
  CANT_KICK:              0x020,
  CANT_MUTE:              0x040,
  CANT_CHANGE_PASSWORD:   0x080,
  DONT_PRESERVE:          0x100,
};

function channelRightsFlags(flags) {
  if (!flags) return [];
  const active = [];
  if (flags & CR.FORCE_NO_ANNOUNCEMENTS) active.push('No Announcements');
  if (flags & CR.FORCE_ANNOUNCEMENTS)    active.push('Force Announcements');
  if (flags & CR.NO_OWNERSHIP)           active.push('No Ownership');
  if (flags & CR.CANT_SPEAK)             active.push('Read-only');
  if (flags & CR.CANT_BAN)               active.push('No Bans');
  if (flags & CR.CANT_KICK)              active.push('No Kicks');
  if (flags & CR.CANT_MUTE)              active.push('No Mutes');
  if (flags & CR.CANT_CHANGE_PASSWORD)   active.push('Password Locked');
  if (flags & CR.DONT_PRESERVE)          active.push('Not Preserved');
  return active;
}

// GET /api/channels — list all channels with ban counts
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await charPool.query(`
        SELECT c.channelId, c.name, c.team, c.announce, c.ownership,
               c.lastUsed,
               (c.password != '') AS hasPassword,
               COUNT(cb.playerGUID) AS banCount
        FROM channels c
        LEFT JOIN channels_bans cb ON c.channelId = cb.channelId
        GROUP BY c.channelId
        ORDER BY c.lastUsed DESC
      `);
    } catch {
      // channels_bans may not exist — fall back to channels only
      [rows] = await charPool.query(`
        SELECT channelId, name, team, announce, ownership,
               lastUsed,
               (password != '') AS hasPassword,
               0 AS banCount
        FROM channels
        ORDER BY lastUsed DESC
      `);
    }
    res.json(rows.map((r) => ({
      channelId:   r.channelId,
      name:        r.name,
      team:        TEAM_LABELS[r.team] ?? `Team ${r.team}`,
      announce:    !!r.announce,
      ownership:   !!r.ownership,
      lastUsed:    r.lastUsed,
      hasPassword: !!r.hasPassword,
      banCount:    r.banCount,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/:id — channel detail with bans and optional rights config
router.get('/:id', requireGMLevel(1), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[channel]] = await charPool.query(`
      SELECT channelId, name, team, announce, ownership, lastUsed,
             (password != '') AS hasPassword
      FROM channels WHERE channelId = ?
    `, [id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // Per-player bans from channels_bans
    let bans = [];
    try {
      [bans] = await charPool.query(`
        SELECT cb.playerGUID, cb.banTime, ch.name AS charName
        FROM channels_bans cb
        LEFT JOIN characters ch ON ch.guid = cb.playerGUID
        WHERE cb.channelId = ?
        ORDER BY ch.name
      `, [id]);
    } catch {
      // channels_bans table may not exist
    }

    // Channel-wide rights config from channels_rights (keyed by channel name)
    let rights = null;
    try {
      const [[cr]] = await charPool.query(
        'SELECT flags, speakdelay, joinmessage, delaymessage, moderators FROM channels_rights WHERE name = ?',
        [channel.name]
      );
      if (cr) {
        rights = {
          flags:       cr.flags,
          flagLabels:  channelRightsFlags(cr.flags),
          speakdelay:  cr.speakdelay,
          joinmessage: cr.joinmessage || null,
          delaymessage:cr.delaymessage || null,
          moderators:  cr.moderators || null,
        };
      }
    } catch {
      // channels_rights table may not exist
    }

    res.json({
      channelId:   channel.channelId,
      name:        channel.name,
      team:        TEAM_LABELS[channel.team] ?? `Team ${channel.team}`,
      announce:    !!channel.announce,
      ownership:   !!channel.ownership,
      lastUsed:    channel.lastUsed,
      hasPassword: !!channel.hasPassword,
      rights,
      bans: bans.map((b) => ({
        guid:    b.playerGUID,
        name:    b.charName || `GUID ${b.playerGUID}`,
        banTime: b.banTime,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id/bans/:guid — unban a player from a channel (GM 2+)
router.delete('/:id/bans/:guid', requireGMLevel(2), async (req, res) => {
  const channelId = parseInt(req.params.id, 10);
  const guid      = parseInt(req.params.guid, 10);
  try {
    await charPool.query(
      'DELETE FROM channels_bans WHERE channelId = ? AND playerGUID = ?',
      [channelId, guid]
    );
    audit(req, 'channel.unban', `channelId=${channelId} guid=${guid}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id — delete a channel and its bans (GM 3+)
router.delete('/:id', requireGMLevel(3), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    try { await charPool.query('DELETE FROM channels_bans WHERE channelId = ?', [id]); } catch {}
    await charPool.query('DELETE FROM channels WHERE channelId = ?', [id]);
    audit(req, 'channel.delete', `channelId=${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
