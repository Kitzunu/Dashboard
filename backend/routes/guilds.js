const express  = require('express');
const { charPool, worldPool } = require('../db');
const { requireGMLevel } = require('../middleware/auth');

const router = express.Router();

// GET /api/guilds — list all guilds with leader name and member count
router.get('/', requireGMLevel(1), async (req, res) => {
  try {
    const [guilds] = await charPool.query(`
      SELECT g.guildid, g.name, g.leaderguid,
             c.name          AS leaderName,
             COUNT(gm.guid)  AS memberCount,
             g.BankMoney, g.createdate, g.motd,
             g.emblemstyle, g.emblemcolor,
             g.borderstyle,  g.bordercolor, g.backgroundcolor
      FROM guild g
      LEFT JOIN characters  c  ON g.leaderguid = c.guid
      LEFT JOIN guild_member gm ON g.guildid   = gm.guildid
      GROUP BY g.guildid
      ORDER BY g.name ASC
    `);
    res.json(guilds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guilds/:id — full guild detail: members, ranks, event log
router.get('/:id', requireGMLevel(1), async (req, res) => {
  const guildId = parseInt(req.params.id, 10);
  if (!guildId) return res.status(400).json({ error: 'Invalid guild ID' });

  try {
    const [[guild]] = await charPool.query(`
      SELECT g.guildid, g.name, g.leaderguid,
             c.name AS leaderName,
             g.BankMoney, g.createdate, g.motd, g.info,
             g.emblemstyle, g.emblemcolor,
             g.borderstyle,  g.bordercolor, g.backgroundcolor
      FROM guild g
      LEFT JOIN characters c ON g.leaderguid = c.guid
      WHERE g.guildid = ?
    `, [guildId]);

    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const [members] = await charPool.query(`
      SELECT gm.guid, c.name, c.class, c.level, c.race,
             gm.rank, gr.rname AS rankName, gm.pnote, gm.offnote
      FROM guild_member gm
      JOIN  characters  c  ON gm.guid    = c.guid
      LEFT JOIN guild_rank gr ON gm.guildid = gr.guildid AND gm.rank = gr.rid
      WHERE gm.guildid = ?
      ORDER BY gm.rank ASC, c.name ASC
    `, [guildId]);

    const [ranks] = await charPool.query(`
      SELECT rid, rname, rights, BankMoneyPerDay
      FROM guild_rank
      WHERE guildid = ?
      ORDER BY rid ASC
    `, [guildId]);

    const [eventLog] = await charPool.query(`
      SELECT gel.EventType, gel.PlayerGuid1, gel.PlayerGuid2, gel.NewRank, gel.TimeStamp,
             c1.name AS player1Name, c2.name AS player2Name
      FROM   guild_eventlog gel
      LEFT JOIN characters c1 ON gel.PlayerGuid1 = c1.guid
      LEFT JOIN characters c2 ON gel.PlayerGuid2 = c2.guid
      WHERE gel.guildid = ?
      ORDER BY gel.TimeStamp DESC
      LIMIT 100
    `, [guildId]);

    res.json({ ...guild, members, ranks, eventLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guilds/:id/bank — guild bank tabs and items
router.get('/:id/bank', requireGMLevel(1), async (req, res) => {
  const guildId = parseInt(req.params.id, 10);
  if (!guildId) return res.status(400).json({ error: 'Invalid guild ID' });

  try {
    const [tabs] = await charPool.query(`
      SELECT TabId, TabName, TabIcon, TabText
      FROM guild_bank_tab
      WHERE guildid = ?
      ORDER BY TabId ASC
    `, [guildId]);

    // Bank event log (item deposits/withdrawals/moves per tab)
    const [eventLog] = await charPool.query(`
      SELECT gbel.TabId, gbel.EventType, gbel.PlayerGuid, gbel.ItemOrMoney,
             gbel.ItemStackCount, gbel.DestTabId, gbel.TimeStamp,
             c.name AS playerName
      FROM guild_bank_eventlog gbel
      LEFT JOIN characters c ON gbel.PlayerGuid = c.guid
      WHERE gbel.guildid = ? AND gbel.TabId < 100
      ORDER BY gbel.TimeStamp DESC
      LIMIT 200
    `, [guildId]);

    // Money log (TabId = 255 in AzerothCore)
    const [moneyLog] = await charPool.query(`
      SELECT gbel.EventType, gbel.PlayerGuid, gbel.ItemOrMoney, gbel.TimeStamp,
             c.name AS playerName
      FROM guild_bank_eventlog gbel
      LEFT JOIN characters c ON gbel.PlayerGuid = c.guid
      WHERE gbel.guildid = ? AND gbel.TabId >= 100
      ORDER BY gbel.TimeStamp DESC
      LIMIT 200
    `, [guildId]);

    const [items] = await charPool.query(`
      SELECT gbi.TabId, gbi.SlotId, ii.itemEntry, ii.count,
             ii.enchantments, ii.randomPropertyId
      FROM guild_bank_item gbi
      JOIN item_instance ii ON gbi.item_guid = ii.guid
      WHERE gbi.guildid = ?
      ORDER BY gbi.TabId ASC, gbi.SlotId ASC
    `, [guildId]);

    // Fetch item names and quality from world DB for all unique item entries
    // Resolve item names for bank contents and event log
    const allEntryIds = [...new Set([
      ...items.map((i) => i.itemEntry),
      ...eventLog.filter((e) => e.ItemOrMoney && [1,2,3,7].includes(e.EventType)).map((e) => e.ItemOrMoney),
    ])];
    let itemTemplates = [];
    if (allEntryIds.length > 0) {
      [itemTemplates] = await worldPool.query(
        `SELECT entry, name, Quality, stackable FROM item_template WHERE entry IN (?)`,
        [allEntryIds]
      );
    }

    const templateMap = Object.fromEntries(itemTemplates.map((t) => [t.entry, t]));

    // Merge template info into items and group by tab
    const tabMap = Object.fromEntries(tabs.map((t) => [t.TabId, { ...t, items: [] }]));
    for (const item of items) {
      const tpl = templateMap[item.itemEntry] ?? {};
      if (tabMap[item.TabId]) {
        tabMap[item.TabId].items.push({
          slotId:    item.SlotId,
          itemEntry: item.itemEntry,
          count:     item.count,
          name:      tpl.name    ?? `Item #${item.itemEntry}`,
          quality:   tpl.Quality ?? 1,
          stackable: tpl.stackable ?? 1,
        });
      }
    }

    // Enrich event log with item names
    const enrichedEventLog = eventLog.map((e) => {
      const tpl = templateMap[e.ItemOrMoney];
      return {
        ...e,
        itemName:    tpl?.name    ?? null,
        itemQuality: tpl?.Quality ?? 1,
      };
    });

    res.json({ tabs: Object.values(tabMap), eventLog: enrichedEventLog, moneyLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
