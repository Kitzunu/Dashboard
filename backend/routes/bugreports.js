const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

const PAGE_SIZE = 25;

const FEEDBACK_TYPES = { 0: 'Bug', 1: 'Suggestion', 2: 'Survey' };

// ── Classification lookup tables ──────────────────────────────────────────────

const SURVEY_SCHEMAS = {
  Areas:  [
    { label: 'Difficulty', opts: ['Easy', 'Manageable', 'Challenging', 'Hard'] },
    { label: 'Reward',     opts: ['Awful', 'Bad', 'Good', 'Awesome'] },
    { label: 'Fun',        opts: ['Not fun at all', 'Not very fun', 'Pretty fun', 'A lot of fun'] },
  ],
  Items:  [
    { label: 'Difficulty', opts: ['Easy', 'Manageable', 'Challenging', 'Hard'] },
    { label: 'Utility',    opts: ['Quite Useless', 'Somewhat Useless', 'Useful', 'Quite Useful'] },
    { label: 'Appearance', opts: ['Ugly', 'Below Average', 'Above Average', 'Beautiful'] },
  ],
  Mobs:   [
    { label: 'Difficulty', opts: ['Easy', 'Manageable', 'Challenging', 'Hard', 'N/A'] },
    { label: 'Reward',     opts: ['Awful', 'Bad', 'Good', 'Awesome', 'N/A'] },
    { label: 'Fun',        opts: ['Not fun at all', 'Not very fun', 'Pretty fun', 'A lot of fun'] },
    { label: 'Appearance', opts: ['Ugly', 'Below Average', 'Above Average', 'Beautiful'] },
  ],
  Quests: [
    { label: 'Clarity',    opts: ['Extremely vague', 'Somewhat vague', 'Fairly clear', 'Perfectly clear'] },
    { label: 'Difficulty', opts: ['Easy', 'Manageable', 'Challenging', 'Hard'] },
    { label: 'Reward',     opts: ['Awful', 'Bad', 'Good', 'Awesome'] },
    { label: 'Fun',        opts: ['Not fun at all', 'Not very fun', 'Pretty fun', 'A lot of fun'] },
  ],
  Spells: [
    { label: 'Power',           opts: ['Very Weak', 'Weak', 'Powerful', 'Very Powerful'] },
    { label: 'Frequency',       opts: ['Rarely', 'Occasionally', 'Frequently', 'Whenever Possible'] },
    { label: 'Appropriateness', opts: ['Very Inappropriate', 'Somewhat Inappropriate', 'Good Fit', 'Perfect Fit'] },
    { label: 'Fun',             opts: ['Not fun at all', 'Not very fun', 'Pretty fun', 'A lot of fun'] },
  ],
};

// `where` stores the summary.value from FEEDBACKUI_AREATABLE.
// Value 1 = everywhere; 2–11 = Outland zones; 12–43 = Eastern Kingdoms zones;
// 44–69 = Kalimdor zones; 70–72 = non-game locations; 73 = Isle of Quel'Danas;
// 74–87 = Northrend zones.
const WHERE_NAMED = {
  '1':  'Everywhere in-game',
  // Outland
  '2':  'Outland — all zones',
  '3':  'Blade\'s Edge Mountains',
  '4':  'Hellfire Peninsula',
  '5':  'Nagrand',
  '6':  'Netherstorm',
  '7':  'Shadowmoon Valley',
  '8':  'Shattrath City',
  '9':  'Terokkar Forest',
  '10': 'Twisting Nether',
  '11': 'Zangarmarsh',
  // Eastern Kingdoms
  '12': 'Eastern Kingdoms — all zones',
  '13': 'Alterac Mountains',
  '14': 'Alterac Valley',
  '15': 'Arathi Basin',
  '16': 'Arathi Highlands',
  '17': 'Badlands',
  '18': 'Blackrock Mountain',
  '19': 'Blasted Lands',
  '20': 'Burning Steppes',
  '21': 'Deadwind Pass',
  '22': 'Dun Morogh',
  '23': 'Duskwood',
  '24': 'Eastern Plaguelands',
  '25': 'Elwynn Forest',
  '26': 'Eversong Woods',
  '27': 'Ghostlands',
  '28': 'Hillsbrad Foothills',
  '29': 'The Hinterlands',
  '30': 'Ironforge',
  '31': 'Loch Modan',
  '32': 'Redridge Mountains',
  '33': 'Searing Gorge',
  '34': 'Silvermoon City',
  '35': 'Silverpine Forest',
  '36': 'Stormwind City',
  '37': 'Stranglethorn Vale',
  '38': 'Swamp of Sorrows',
  '39': 'Tirisfal Glades',
  '40': 'Undercity',
  '41': 'Western Plaguelands',
  '42': 'Westfall',
  '43': 'Wetlands',
  // Kalimdor
  '44': 'Kalimdor — all zones',
  '45': 'Ashenvale',
  '46': 'Azshara',
  '47': 'Azuremyst Isle',
  '48': 'The Barrens',
  '49': 'Bloodmyst Isle',
  '50': 'Darkshore',
  '51': 'Darnassus',
  '52': 'Desolace',
  '53': 'Durotar',
  '54': 'Dustwallow Marsh',
  '55': 'The Exodar',
  '56': 'Felwood',
  '57': 'Feralas',
  '58': 'Moonglade',
  '59': 'Mulgore',
  '60': 'Orgrimmar',
  '61': 'Silithus',
  '62': 'Stonetalon Mountains',
  '63': 'Tanaris',
  '64': 'Teldrassil',
  '65': 'Thunder Bluff',
  '66': 'Thousand Needles',
  '67': 'Un\'Goro Crater',
  '68': 'Warsong Gulch',
  '69': 'Winterspring',
  // Non-game
  '70': 'During installation',
  '71': 'While downloading',
  '72': 'While patching',
  // Isle of Quel'Danas (Eastern Kingdoms)
  '73': 'Isle of Quel\'Danas',
  // Northrend
  '74': 'Northrend — all zones',
  '75': 'Borean Tundra',
  '76': 'Dragonblight',
  '77': 'Grizzly Hills',
  '78': 'Howling Fjord',
  '79': 'The Nexus',
  '80': 'Utgarde Pinnacle',
  '81': 'Crystalsong Forest',
  '82': 'Dalaran',
  '83': 'Icecrown',
  '84': 'Sholazar Basin',
  '85': 'The Storm Peaks',
  '86': 'Wintergrasp',
  '87': 'Zul\'Drak',
};

const WHO_LABELS = {
  '1': 'My character',
  '2': 'Party members',
  '3': 'Raid members',
  '4': 'An enemy player',
  '5': 'A friendly player',
  '6': 'An enemy creature',
  '7': 'A friendly creature',
};

// Flat sequential index matching the Type tree top-to-bottom.
// Values sourced directly from FEEDBACKUI_GENERICTYPETABLE and FEEDBACKUI_VOICECHATTABLE.
// UI: 1-6, Graphical: 7-11, Functionality: 12-17, Stability: 18-22, Voice chat: 23-25.
const TYPE_LABELS = {
  // UI
  '1':  'UI issue (general)',
  '2':  'Item UI issue',
  '3':  'Creature UI issue',
  '4':  'Quest UI issue',
  '5':  'Spell / talent UI issue',
  '6':  'Tradeskill UI issue',
  // Graphical
  '7':  'Graphical issue (general)',
  '8':  'Item graphics issue',
  '9':  'Creature graphics issue',
  '10': 'Spell / talent graphics issue',
  '11': 'Environmental graphics issue',
  // Functionality
  '12': 'Functionality issue (general)',
  '13': 'Item functionality issue',
  '14': 'Creature functionality issue',
  '15': 'Quest functionality issue',
  '16': 'Spell / talent functionality issue',
  '17': 'Tradeskill functionality issue',
  // Stability
  '18': 'Stability issue (general)',
  '19': 'Stability — WoW crash',
  '20': 'Stability — WoW stops responding',
  '21': 'Stability — computer stops responding',
  '22': 'Stability — lag',
  // Voice chat
  '23': 'Voice chat — USB headset',
  '24': 'Voice chat — analog headset',
  '25': 'Voice chat — hardwired microphone',
};

const WHEN_LABELS = {
  '1': 'Only happened once',
  '2': 'Occurs rarely',
  '3': 'Occurs occasionally',
  '4': 'Occurs all the time',
};

function decodeSurveyRatings(t) {
  const schema = SURVEY_SCHEMAS[t.surveytype];
  if (!schema) return null;
  const cats = [t.category1, t.category2, t.category3, t.category4];
  return schema.map((dim, i) => {
    const n = parseInt(cats[i], 10);
    const label = (n >= 1 && n <= dim.opts.length) ? dim.opts[n - 1] : null;
    // N/A is a sentinel, not a real rating step — exclude any trailing N/A
    // entries from the pip count so stars always reflect the true rating range.
    const ratingMax = dim.opts.reduce(
      (acc, opt, idx) => (opt !== 'N/A' ? idx + 1 : acc), 0
    );
    return { label: dim.label, value: n || 0, text: label, max: ratingMax };
  });
}

function decodeWhere(val) {
  if (!val) return null;
  const s = String(val);
  return WHERE_NAMED[s] || `Unknown location (where=${s})`;
}

function decodeWho(val) {
  return val ? (WHO_LABELS[String(val)] || `Code ${val}`) : null;
}

function decodeType(val) {
  return val ? (TYPE_LABELS[String(val)] || `Code ${val}`) : null;
}

function decodeWhen(val) {
  return val ? (WHEN_LABELS[String(val)] || `Code ${val}`) : null;
}

// Safely parse the JSON `type` column — it is valid JSON but may be malformed on
// some older rows.
function parseType(raw) {
  try { return JSON.parse(raw); } catch { return {}; }
}

// Parse the tab-delimited `content` column into a plain object.
//
// Three line formats exist in practice:
//   "Key:\t\tValue"      — standard key/value (tab at some position > 0)
//   "Key:"               — bare key with no value on the same line (e.g. "Auras:")
//   "\tValue"            — tab-indented continuation item (e.g. each aura entry)
function parseContent(raw) {
  if (!raw) return {};
  const result = {};
  const lines = raw.split('\n');
  let lastKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const tabIdx = line.indexOf('\t');

    if (tabIdx === -1) {
      // No tab at all — either a bare key like "Auras:" or a plain continuation line.
      const trimmed = line.trim();
      const bareKey = trimmed.match(/^([A-Za-z][A-Za-z0-9 &/]+?):\s*$/);
      if (bareKey) {
        const key = bareKey[1].trim();
        result[key] = '';
        lastKey = key;
      } else if (lastKey !== null) {
        result[lastKey] = result[lastKey]
          ? result[lastKey] + '\n' + trimmed
          : trimmed;
      }
      continue;
    }

    if (tabIdx === 0) {
      // Line starts with a tab — tab-indented value continuation (e.g. aura list items).
      const value = line.replace(/^\t+/, '').trim();
      if (lastKey !== null) {
        result[lastKey] = result[lastKey]
          ? result[lastKey] + '\n' + value
          : value;
      }
      continue;
    }

    // Standard "Key:\t\tValue" line.
    const rawKey = line.slice(0, tabIdx).replace(/:$/, '').trim();
    const value  = line.slice(tabIdx).replace(/^\t+/, '').trim();
    result[rawKey] = value;
    lastKey = rawKey;
  }

  return result;
}

// Extract the most useful summary fields from a parsed type object
function summarise(t, c) {
  const feedbackTypeNum = Number(t.feedbacktype ?? -1);

  // Survey-specific: decode category ratings into labelled objects
  const surveyRatings = feedbackTypeNum === 2 ? decodeSurveyRatings(t) : null;

  // Bug/Suggestion-specific: decode where/who/type/when
  const classification = (feedbackTypeNum === 0 || feedbackTypeNum === 1) ? {
    where:    decodeWhere(t.where),
    who:      decodeWho(t.who),
    type:     decodeType(t.type),
    when:     decodeWhen(t.when),
    subjectId:   t.reportSubjectId   || null,
    subjectType: t.reportSubjectType || null,
  } : null;

  return {
    character:    t.name      || c.Character || '—',
    charDesc:     t.character || '—',
    account:      c.Account   || '—',
    realm:        t.realm     || c.Realm     || '—',
    zone:         t.zone      || c.Zone      || '—',
    map:          t.map       || '—',
    coords:       t.coords    || '—',
    position:     c.Position  || t.playerPosition || '—',
    target:       c.Target    || t.surveyname || t.objectname || '—',
    targetGUID:   t.targetGUID || '—',
    feedbackType: FEEDBACK_TYPES[feedbackTypeNum] ?? `Type ${feedbackTypeNum}`,
    feedbackTypeNum,
    reportDate:   t.surveysubmitted || t.reportDate || t.reportCalendar || '—',
    reportSubject: t.surveyname || t.objectname || '—',
    reportSubjectType: t.reportSubjectType || t.reportSubjectSubType || '—',
    surveyType:   t.surveytype || '—',
    userText:     (t.text && !t.text.startsWith('Please')) ? t.text : '',
    // decoded classification data
    surveyRatings,
    classification,
    // system info from content
    computer:     c.Computer  || '—',
    processors:   c.Processors || '—',
    processorVendor: c['Processor vendor'] || '—',
    processorSpeed: c['Processor speed'] || '—',
    memory:       c.Memory    || '—',
    os:           c.OS        || '—',
    wowVersion:   c.Version   || t.version   || '—',
    build:        t.build     || '—',
    auras:        c.Auras     || '—',
    addonsLoaded: t.addonsloaded || '—',
    addonsDisabled: t.addonsdisabled || '—',
    addonTitle:   t.addonTitle || '—',
    addonVersion: t.addonVersion || '—',
    locale:       t.locale    || '—',
    // keep raw for advanced view
    _type: t,
  };
}

// GET /api/bugreports?page=1&feedbackType=all&state=1&search=term
router.get('/', requireGMLevel(1), async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = req.query.feedbackType; // '0', '1', '2' or omitted for all
  const state  = req.query.state;        // '0'=closed, '1'=open, omitted=all
  const search = (req.query.search || '').trim();
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const conditions = [];
    const params = [];

    if (filter !== undefined && filter !== 'all' && filter !== '') {
      conditions.push(`type LIKE ?`);
      params.push(`%"feedbacktype" : "${filter}"%`);
    }

    if (state !== undefined && state !== 'all' && state !== '') {
      conditions.push(`state = ?`);
      params.push(parseInt(state, 10));
    }

    if (search) {
      // Split into words so "hello world" matches rows containing either word.
      // Each word is matched against the extracted character name, zone, subject
      // fields (via JSON_EXTRACT) and the assignee SQL column.
      const words = search.split(/\s+/).filter(Boolean);
      const wordClauses = words.map(() => `(
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(type, '$.name')))       LIKE ? OR
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(type, '$.zone')))       LIKE ? OR
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(type, '$.surveyname'))) LIKE ? OR
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(type, '$.objectname'))) LIKE ? OR
        LOWER(assignee) LIKE ?
      )`);
      conditions.push(`(${wordClauses.join(' OR ')})`);
      for (const word of words) {
        const like = `%${word.toLowerCase()}%`;
        params.push(like, like, like, like, like);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await charPool.query(
      `SELECT COUNT(*) AS total FROM bugreport ${where}`,
      params
    );

    const [rows] = await charPool.query(
      `SELECT id, type, content, state, assignee, comment FROM bugreport ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const reports = rows.map((row) => {
      const t = parseType(row.type);
      const c = parseContent(row.content);
      const s = summarise(t, c);
      return {
        id:              row.id,
        state:           row.state ?? 1,
        assignee:        row.assignee || null,
        comment:         row.comment  || null,
        character:       s.character,
        zone:            s.zone,
        reportDate:      s.reportDate,
        reportSubject:   s.reportSubject,
        feedbackType:    s.feedbackType,
        feedbackTypeNum: s.feedbackTypeNum,
      };
    });

    res.json({ reports, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bugreports/:id  — full parsed detail
router.get('/:id', requireGMLevel(1), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [[row]] = await charPool.query(
      'SELECT id, type, content, state, assignee, comment FROM bugreport WHERE id = ?', [id]
    );
    if (!row) return res.status(404).json({ error: 'Report not found' });

    const t = parseType(row.type);
    const c = parseContent(row.content);
    const s = summarise(t, c);

    res.json({
      id:       row.id,
      state:    row.state ?? 1,
      assignee: row.assignee || null,
      comment:  row.comment  || null,
      ...s,
      surveyRatings:  s.surveyRatings,
      classification: s.classification,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bugreports/:id  — update state, assignee, and/or comment
router.patch('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { state, assignee, comment } = req.body;
  const updates = [];
  const params  = [];

  if (state    !== undefined) { updates.push('state = ?');    params.push(state); }
  if (assignee !== undefined) { updates.push('assignee = ?'); params.push(assignee || null); }
  if (comment  !== undefined) { updates.push('comment = ?');  params.push(comment  || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id);

  try {
    await charPool.query(`UPDATE bugreport SET ${updates.join(', ')} WHERE id = ?`, params);
    const parts = [];
    if (state    !== undefined) parts.push(`state=${state}`);
    if (assignee !== undefined) parts.push(`assignee=${assignee || 'cleared'}`);
    if (comment  !== undefined) parts.push('comment updated');
    audit(req, 'bugreport.update', `id=${id} ${parts.join(' ')}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
