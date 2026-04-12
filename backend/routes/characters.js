const express   = require('express');
const { requireGMLevel } = require('../middleware/auth');
const dbc = require('../dbc');

const router = express.Router();

// AzerothCore inventory slot constants
const EQUIP_START      = 0;   const EQUIP_END      = 19;
const BAG_SLOT_START   = 19;  const BAG_SLOT_END   = 23;
const PACK_START       = 23;  const PACK_END       = 39;
const BANK_START       = 67;  const BANK_END       = 95;
const BANK_BAG_START   = 95;  const BANK_BAG_END   = 102;

const EQUIP_SLOT_NAMES = {
  0: 'Head', 1: 'Neck', 2: 'Shoulders', 3: 'Shirt', 4: 'Chest',
  5: 'Waist', 6: 'Legs', 7: 'Feet', 8: 'Wrists', 9: 'Hands',
  10: 'Finger 1', 11: 'Finger 2', 12: 'Trinket 1', 13: 'Trinket 2',
  14: 'Back', 15: 'Main Hand', 16: 'Off Hand', 17: 'Ranged', 18: 'Tabard',
};

// Common WotLK currency IDs
const CURRENCY_NAMES = {
  101:  'Honor Points',
  103:  'Arena Points',
  1014: "Stone Keeper's Shards",
  1901: 'Spirit Shards',
  2131: 'Emblem of Heroism',
  2132: 'Emblem of Valor',
  2133: 'Emblem of Conquest',
  2134: 'Emblem of Triumph',
  2137: 'Emblem of Frost',
  2588: "Champion's Seal",
};


function standingLabel(standing) {
  if (standing >= 42000) return 'Exalted';
  if (standing >= 21000) return 'Revered';
  if (standing >=  9000) return 'Honored';
  if (standing >=  3000) return 'Friendly';
  if (standing >=     0) return 'Neutral';
  if (standing >= -3000) return 'Unfriendly';
  if (standing >= -6000) return 'Hostile';
  return 'Hated';
}

function standingProgress(standing) {
  if (standing >= 42000) return { current: 1000, max: 1000 };
  if (standing >= 21000) return { current: standing - 21000, max: 21000 };
  if (standing >=  9000) return { current: standing -  9000, max: 12000 };
  if (standing >=  3000) return { current: standing -  3000, max:  6000 };
  if (standing >=     0) return { current: standing,         max:  3000 };
  if (standing >= -3000) return { current: standing + 3000,  max:  3000 };
  if (standing >= -6000) return { current: standing + 6000,  max:  3000 };
  return { current: standing + 42000, max: 36000 };
}

// ── Search ────────────────────────────────────────────────────────────────────

router.get('/search', requireGMLevel(1), async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  try {
    const [rows] = await req.charPool.query(
      `SELECT guid, name, race, \`class\`, level, online
       FROM characters WHERE LOWER(name) LIKE ? ORDER BY name LIMIT 50`,
      [`${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Full character detail ─────────────────────────────────────────────────────

router.get('/:guid', requireGMLevel(1), async (req, res) => {
  const guid = parseInt(req.params.guid, 10);
  if (!guid) return res.status(400).json({ error: 'Invalid GUID' });

  try {
    // Base character info
    const [[char]] = await req.charPool.query(
      `SELECT guid, account, name, race, \`class\`, gender, level, money, online,
              totaltime, arenaPoints, totalHonorPoints, totalKills, zone,
              health, power1, power2, power3, power4, power5, power6, power7
       FROM characters WHERE guid = ?`,
      [guid]
    );
    if (!char) return res.status(404).json({ error: 'Character not found' });

    // Character stats (populated by server on login/logout; may be empty for never-logged-in chars)
    const [[statsRow]] = await req.charPool.query(
      `SELECT maxhealth, maxpower1, maxpower2, maxpower3, maxpower4, maxpower5, maxpower6, maxpower7,
              strength, agility, stamina, intellect, spirit, armor,
              resHoly, resFire, resNature, resFrost, resShadow, resArcane,
              blockPct, dodgePct, parryPct, critPct, rangedCritPct, spellCritPct,
              attackPower, rangedAttackPower, spellPower, resilience
       FROM character_stats WHERE guid = ?`,
      [guid]
    );

    // All inventory in one shot
    const [inventory] = await req.charPool.query(
      `SELECT ci.bag, ci.slot, ci.item AS itemGuid, ii.itemEntry, ii.count
       FROM character_inventory ci
       JOIN item_instance ii ON ci.item = ii.guid
       WHERE ci.guid = ?`,
      [guid]
    );

    // Classify inventory rows
    const equipped         = [];
    const bagContainers    = {}; // slot 19-22 → row
    const bankBagContainers= {}; // slot 95-101 → row
    const backpackItems    = [];
    const bankItems        = [];
    const bagItemsByGuid   = {};

    for (const row of inventory) {
      if (row.bag === 0) {
        if (row.slot >= EQUIP_START    && row.slot < EQUIP_END)      equipped.push(row);
        else if (row.slot >= BAG_SLOT_START && row.slot < BAG_SLOT_END) bagContainers[row.slot] = row;
        else if (row.slot >= PACK_START     && row.slot < PACK_END)     backpackItems.push(row);
        else if (row.slot >= BANK_START     && row.slot < BANK_END)     bankItems.push(row);
        else if (row.slot >= BANK_BAG_START && row.slot < BANK_BAG_END) bankBagContainers[row.slot] = row;
      } else {
        if (!bagItemsByGuid[row.bag]) bagItemsByGuid[row.bag] = [];
        bagItemsByGuid[row.bag].push(row);
      }
    }

    // Resolve item names/quality from world DB
    const allEntries = [...new Set(inventory.map((i) => i.itemEntry))];
    let tplMap = {};
    if (allEntries.length > 0) {
      const [tpls] = await req.worldPool.query(
        'SELECT entry, name, Quality, class AS itemClass FROM item_template WHERE entry IN (?)',
        [allEntries]
      );
      tplMap = Object.fromEntries(tpls.map((t) => [t.entry, t]));
    }

    const enrich = (row, extraSlot) => {
      const tpl = tplMap[row.itemEntry] ?? {};
      return {
        slot:      extraSlot ?? row.slot,
        itemEntry: row.itemEntry,
        count:     row.count,
        name:      tpl.name    ?? `Item #${row.itemEntry}`,
        quality:   tpl.Quality ?? 1,
      };
    };

    // Build equipment: all 19 slots, empty slots included
    const equipmentMap = Object.fromEntries(equipped.map((r) => [r.slot, enrich(r)]));
    const equipment = Object.entries(EQUIP_SLOT_NAMES).map(([slot, label]) => ({
      slot:  parseInt(slot),
      label,
      item:  equipmentMap[slot] ?? null,
    }));

    // Build bags
    const bags = [
      {
        label: 'Backpack',
        items: backpackItems.map((r) => enrich(r)),
      },
      ...[19, 20, 21, 22].map((bagSlot, i) => {
        const container = bagContainers[bagSlot];
        const containerTpl = container ? (tplMap[container.itemEntry] ?? {}) : null;
        return {
          label:     container ? (containerTpl?.name ?? `Bag ${i + 1}`) : `Bag ${i + 1}`,
          itemEntry: container?.itemEntry ?? null,
          empty:     !container,
          items:     container ? (bagItemsByGuid[container.itemGuid] ?? []).map((r) => enrich(r)) : [],
        };
      }),
    ];

    // Build bank — split main bank items into regular items vs. bag containers stored in main slots
    const mainBankRegular = [];
    const mainBankBags    = [];
    for (const r of bankItems) {
      const tpl = tplMap[r.itemEntry] ?? {};
      if (tpl.itemClass === 1) mainBankBags.push(r);  // class 1 = Container
      else                     mainBankRegular.push(r);
    }

    const bank = {
      main: mainBankRegular.map((r) => enrich(r)),
      bags: [
        // Dedicated bank bag slots (95–101)
        ...[95, 96, 97, 98, 99, 100, 101].map((bagSlot, i) => {
          const container    = bankBagContainers[bagSlot];
          const containerTpl = container ? (tplMap[container.itemEntry] ?? {}) : null;
          return {
            label:     container ? (containerTpl?.name ?? `Bank Bag ${i + 1}`) : `Bank Bag ${i + 1}`,
            itemEntry: container?.itemEntry ?? null,
            empty:     !container,
            items:     container ? (bagItemsByGuid[container.itemGuid] ?? []).map((r) => enrich(r)) : [],
          };
        }),
        // Bags placed directly inside main bank slots
        ...mainBankBags.map((r) => {
          const containerTpl = tplMap[r.itemEntry] ?? {};
          return {
            label:     containerTpl.name ?? `Bank Bag`,
            itemEntry: r.itemEntry,
            empty:     false,
            items:     (bagItemsByGuid[r.itemGuid] ?? []).map((ir) => enrich(ir)),
          };
        }),
      ],
    };

    // Reputation — names from Faction.dbc
    const factions = dbc.getAllFactions();
    const [repRows] = await req.charPool.query(
      'SELECT faction, standing, flags FROM character_reputation WHERE guid = ? ORDER BY faction ASC',
      [guid]
    );
    const reputation = repRows.map((r) => ({
      faction:      r.faction,
      factionName:  factions[r.faction] ?? `Faction #${r.faction}`,
      standing:     r.standing,
      label:        standingLabel(r.standing),
      progress:     standingProgress(r.standing),
      atWar:        !!(r.flags & 0x02),
      inactive:     !!(r.flags & 0x20),
    }));

    // Currency (graceful — table may not exist on all builds)
    let currency = [];
    try {
      const [currRows] = await req.charPool.query(
        'SELECT Currency, totalCount, weekCount FROM character_currency WHERE guid = ?',
        [guid]
      );
      currency = currRows.map((r) => ({
        id:        r.Currency,
        name:      CURRENCY_NAMES[r.Currency] ?? `Currency #${r.Currency}`,
        total:     r.totalCount,
        thisWeek:  r.weekCount,
      }));
    } catch {}

    // Achievements — grouped by category from DBC
    const [achRows] = await req.charPool.query(
      'SELECT achievement, date FROM character_achievement WHERE guid = ? ORDER BY date DESC',
      [guid]
    );
    const achDbc  = dbc.getAchievements();
    const catDbc  = dbc.getAchievementCategories();

    // Build category label: "Parent > Child" or just "Category"
    function catLabel(catId) {
      const cat = catDbc[catId];
      if (!cat) return `Category #${catId}`;
      if (cat.parentId && catDbc[cat.parentId]) return `${catDbc[cat.parentId].name} › ${cat.name}`;
      return cat.name;
    }

    // Group completed achievements by category
    const achByCategory = {};
    let totalPoints = 0;
    for (const row of achRows) {
      const info = achDbc[row.achievement];
      if (!info) continue;
      const label = catLabel(info.categoryId);
      if (!achByCategory[label]) achByCategory[label] = { label, achievements: [] };
      achByCategory[label].achievements.push({
        id:     row.achievement,
        name:   info.name,
        points: info.points,
        date:   row.date,
      });
      totalPoints += info.points;
    }

    const achievements = {
      totalPoints,
      count: achRows.length,
      categories: Object.values(achByCategory).sort((a, b) => a.label.localeCompare(b.label)),
    };

    // Auras
    const spellDbc = dbc.getAllSpells();
    const [auraRows] = await req.charPool.query(
      `SELECT spell, stackCount, remainTime, maxDuration, remainCharges
       FROM character_aura WHERE guid = ? ORDER BY spell ASC`,
      [guid]
    );
    const auras = auraRows.map((r) => ({
      spellId:        r.spell,
      name:           spellDbc[r.spell] ?? `Spell #${r.spell}`,
      stackCount:     r.stackCount,
      remainTime:     r.remainTime,   // ms; -1 = permanent
      maxDuration:    r.maxDuration,  // ms; -1 = permanent
      remainCharges:  r.remainCharges,
    }));

    // Build stats — null if server has never written character_stats for this char
    const stats = statsRow ? {
      base: {
        strength:  statsRow.strength,
        agility:   statsRow.agility,
        stamina:   statsRow.stamina,
        intellect: statsRow.intellect,
        spirit:    statsRow.spirit,
      },
      health:    { current: char.health,  max: statsRow.maxhealth  },
      powers: {
        maxpower1: statsRow.maxpower1,
        maxpower2: statsRow.maxpower2,
        maxpower3: statsRow.maxpower3,
        maxpower4: statsRow.maxpower4,
        maxpower5: statsRow.maxpower5,
        maxpower6: statsRow.maxpower6,
        maxpower7: statsRow.maxpower7,
        current: {
          power1: char.power1, power2: char.power2, power3: char.power3,
          power4: char.power4, power5: char.power5, power6: char.power6, power7: char.power7,
        },
      },
      combat: {
        attackPower:        statsRow.attackPower,
        rangedAttackPower:  statsRow.rangedAttackPower,
        spellPower:         statsRow.spellPower,
        critPct:            statsRow.critPct,
        rangedCritPct:      statsRow.rangedCritPct,
        spellCritPct:       statsRow.spellCritPct,
        dodgePct:           statsRow.dodgePct,
        parryPct:           statsRow.parryPct,
        blockPct:           statsRow.blockPct,
        armor:              statsRow.armor,
        resilience:         statsRow.resilience,
      },
      resistances: {
        holy:    statsRow.resHoly,
        fire:    statsRow.resFire,
        nature:  statsRow.resNature,
        frost:   statsRow.resFrost,
        shadow:  statsRow.resShadow,
        arcane:  statsRow.resArcane,
      },
    } : null;

    res.json({ ...char, equipment, bags, bank, reputation, currency, achievements, stats, auras });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
