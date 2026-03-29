const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { charPool } = require('../db');

const router = express.Router();

const PAGE_SIZE = 25;

const FEEDBACK_TYPES = { 0: 'Bug', 1: 'Suggestion', 2: 'Feedback' };

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
    feedbackType: FEEDBACK_TYPES[t.feedbacktype] ?? `Type ${t.feedbacktype ?? '?'}`,
    feedbackTypeNum: Number(t.feedbacktype ?? -1),
    reportDate:   t.surveysubmitted || t.reportDate || t.reportCalendar || '—',
    reportSubject: t.surveyname || t.objectname || '—',
    reportSubjectType: t.reportSubjectType || t.reportSubjectSubType || '—',
    surveyType:   t.surveytype || '—',
    userText:     (t.text && !t.text.startsWith('Please')) ? t.text : '',
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

// GET /api/bugreports?page=1&feedbackType=all
router.get('/', requireGMLevel(1), async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = req.query.feedbackType; // '0', '1', '2' or omitted for all
  const offset = (page - 1) * PAGE_SIZE;

  try {
    let where = '';
    const params = [];

    if (filter !== undefined && filter !== 'all' && filter !== '') {
      // feedbacktype is inside the JSON — use a JSON path contains check
      // We match on the literal string to avoid a full JSON parse in SQL
      where = `WHERE type LIKE ?`;
      params.push(`%"feedbacktype" : "${filter}"%`);
    }

    const [[{ total }]] = await charPool.query(
      `SELECT COUNT(*) AS total FROM bugreport ${where}`,
      params
    );

    const [rows] = await charPool.query(
      `SELECT id, type, content FROM bugreport ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const reports = rows.map((row) => {
      const t = parseType(row.type);
      const c = parseContent(row.content);
      const s = summarise(t, c);
      return {
        id:           row.id,
        character:    s.character,
        charDesc:     s.charDesc,
        account:      s.account,
        realm:        s.realm,
        zone:         s.zone,
        reportDate:   s.reportDate,
        reportSubject: s.reportSubject,
        feedbackType: s.feedbackType,
        feedbackTypeNum: s.feedbackTypeNum,
        surveyType:   s.surveyType,
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
    const [[row]] = await charPool.query('SELECT id, type, content FROM bugreport WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Report not found' });

    const t = parseType(row.type);
    const c = parseContent(row.content);
    const s = summarise(t, c);

    res.json({ id: row.id, ...s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bugreports/:id  — dismiss a report
router.delete('/:id', requireGMLevel(2), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await charPool.query('DELETE FROM bugreport WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
