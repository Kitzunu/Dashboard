/**
 * Lightweight DBC binary parser for WotLK (3.3.5a) client data files.
 *
 * DBC file layout:
 *   Header  (20 bytes): magic[4], recordCount[4], fieldCount[4],
 *                       recordSize[4], stringBlockSize[4]
 *   Records (recordCount × recordSize bytes): array of fixed-width records
 *   String block (stringBlockSize bytes): null-terminated UTF-8 strings
 *
 * LocalizedString fields store a uint32 byte-offset into the string block.
 * WotLK uses 16 locale slots per localized field; slot 0 = enUS.
 *
 * Field indices used:
 *   Map.dbc       — ID: 0,  MapName_lang[enUS]: 5
 *   AreaTable.dbc — ID: 0,  MapID: 1,  AreaName_lang[enUS]: 11
 */

const fs   = require('fs');
const path = require('path');

const MAGIC       = 'WDBC';
const HEADER_SIZE = 20;

// ── Binary parser ─────────────────────────────────────────────────────────────
function parseDBC(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[dbc] File not found: ${filePath}`);
    return null;
  }

  const buf = fs.readFileSync(filePath);

  if (buf.toString('ascii', 0, 4) !== MAGIC) {
    console.warn(`[dbc] Invalid magic in: ${filePath}`);
    return null;
  }

  const recordCount     = buf.readUInt32LE(4);
  const fieldCount      = buf.readUInt32LE(8);
  const recordSize      = buf.readUInt32LE(12);
  // stringBlockSize    = buf.readUInt32LE(16)  — not needed directly
  const stringBlockOff  = HEADER_SIZE + recordCount * recordSize;

  // Resolve a string-block offset to a JS string
  function getString(offset) {
    if (!offset) return '';
    let end = stringBlockOff + offset;
    while (end < buf.length && buf[end] !== 0) end++;
    return buf.toString('utf8', stringBlockOff + offset, end);
  }

  const records = [];
  for (let i = 0; i < recordCount; i++) {
    const base = HEADER_SIZE + i * recordSize;
    records.push({
      // Read a uint32 field by zero-based field index
      uint32:    (fi) => buf.readUInt32LE(base + fi * 4),
      // Read a LocalizedString field — the field value is a string-block offset
      locString: (fi) => getString(buf.readUInt32LE(base + fi * 4)),
    });
  }

  return records;
}

// ── Lookup tables (populated once on init) ───────────────────────────────────
let mapNames  = null;   // { [mapId]: string }
let areaNames = null;   // { [areaId]: string }

function dbcDir() {
  return process.env.DBC_PATH || null;
}

function loadMapNames() {
  if (mapNames !== null) return;

  const dir = dbcDir();
  mapNames = {};
  if (!dir) return;

  const records = parseDBC(path.join(dir, 'Map.dbc'));
  if (!records) return;

  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(5);   // MapName_lang[enUS] = field 5
    if (name) mapNames[id] = name;
  }

  console.log(`[dbc] Loaded ${Object.keys(mapNames).length} map names from Map.dbc`);
}

function loadAreaNames() {
  if (areaNames !== null) return;

  const dir = dbcDir();
  areaNames = {};
  if (!dir) return;

  const records = parseDBC(path.join(dir, 'AreaTable.dbc'));
  if (!records) return;

  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(11);  // AreaName_lang[enUS] = field 11
    if (name) areaNames[id] = name;
  }

  console.log(`[dbc] Loaded ${Object.keys(areaNames).length} area names from AreaTable.dbc`);
}

// ── Public API ────────────────────────────────────────────────────────────────
function getMapName(id) {
  if (mapNames === null) loadMapNames();
  return mapNames[id] || null;
}

function getAreaName(id) {
  if (areaNames === null) loadAreaNames();
  return areaNames[id] || null;
}

function getAllMaps() {
  if (mapNames === null) loadMapNames();
  return mapNames;
}

function getAllAreas() {
  if (areaNames === null) loadAreaNames();
  return areaNames;
}

/** Call once at server startup to eager-load both tables. */
function init() {
  if (!dbcDir()) {
    console.log('[dbc] DBC_PATH not configured — map/area name resolution disabled');
    return;
  }
  try { loadMapNames();  } catch (e) { console.warn('[dbc] Map.dbc load error:', e.message); }
  try { loadAreaNames(); } catch (e) { console.warn('[dbc] AreaTable.dbc load error:', e.message); }
}

module.exports = { init, getMapName, getAreaName, getAllMaps, getAllAreas };
