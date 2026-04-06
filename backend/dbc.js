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
 *   Map.dbc                  — ID: 0,  MapName_lang[enUS]: 5
 *   AreaTable.dbc            — ID: 0,  MapID: 1,  AreaName_lang[enUS]: 11
 *   ChrRaces.dbc             — ID: 0,  Name_lang[enUS]: 14
 *   ChrClasses.dbc           — ID: 0,  Name_lang[enUS]: 4
 *   Faction.dbc              — ID: 0,  Name_lang[enUS]: 23
 *   Achievement_Category.dbc — ID: 0,  parentId: 1,  Name_lang[enUS]: 2,  sortOrder: 19
 *   Achievement.dbc          — ID: 0,  Name_lang[enUS]: 4,  categoryId: 38,  points: 39
 *   BattlemasterList.dbc     — ID: 0,  MapID[0..7]: 1–8,  InstanceType: 9,
 *                              Name_lang[enUS]: 11,  MaxGroupSize: 28,
 *                              MinLevel: 30,  MaxLevel: 31
 *   AuctionHouse.dbc         — ID: 0,  FactionID: 1,  DepositRate: 2,
 *                              ConsignmentRate: 3,  Name_lang[enUS]: 4
 *   Spell.dbc                — ID: 0,  SpellName_lang[enUS]: 136
 *     (WotLK 3.3.5a: non-string fields occupy 0–135; each loc-string block is
 *      16 locale slots + 1 flags dword = 17 fields; enUS is always the first slot)
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
let mapNames            = null;   // { [mapId]: string }
let areaNames           = null;   // { [areaId]: string }
let raceNames           = null;   // { [raceId]: string }
let classNames          = null;   // { [classId]: string }
let factionNames        = null;   // { [factionId]: string }
let achievementCats     = null;   // { [catId]: { name, parentId, sortOrder } }
let achievementData     = null;   // { [achievementId]: { name, categoryId, points } }
let charTitleData       = null;   // { [titleBitIndex]: { id, maleName, femaleName } }
let auctionHouseData    = null;   // { [houseId]: { name, factionId, depositRate, consignmentRate } }
let spellNames          = null;   // { [spellId]: string }  — loaded from Spell.dbc (~14 MB)
let bgNames             = null;   // { [bgId]: string }  — loaded from BattlemasterList.dbc (InstanceType=3 only)
let bgNamesAll          = null;   // { [bgId]: string }  — all entries from BattlemasterList.dbc

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

function loadRaceNames() {
  if (raceNames !== null) return;

  const dir = dbcDir();
  raceNames = {};
  if (!dir) return;

  const records = parseDBC(path.join(dir, 'ChrRaces.dbc'));
  if (!records) return;

  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(14);  // Name_lang[enUS] = field 14
    if (name) raceNames[id] = name;
  }

  console.log(`[dbc] Loaded ${Object.keys(raceNames).length} race names from ChrRaces.dbc`);
}

function loadClassNames() {
  if (classNames !== null) return;

  const dir = dbcDir();
  classNames = {};
  if (!dir) return;

  const records = parseDBC(path.join(dir, 'ChrClasses.dbc'));
  if (!records) return;

  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(4);   // Name_lang[enUS] = field 4
    if (name) classNames[id] = name;
  }

  console.log(`[dbc] Loaded ${Object.keys(classNames).length} class names from ChrClasses.dbc`);
}

function loadFactionNames() {
  if (factionNames !== null) return;
  const dir = dbcDir();
  factionNames = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'Faction.dbc'));
  if (!records) return;
  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(23);  // Name_lang[enUS] = field 23
    if (name) factionNames[id] = name;
  }
  console.log(`[dbc] Loaded ${Object.keys(factionNames).length} faction names from Faction.dbc`);
}

function loadAchievementCategories() {
  if (achievementCats !== null) return;
  const dir = dbcDir();
  achievementCats = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'Achievement_Category.dbc'));
  if (!records) return;
  for (const r of records) {
    const id       = r.uint32(0);
    const parentId = r.uint32(1);   // 0xFFFFFFFF = root
    const name     = r.locString(2); // Name_lang[enUS] = field 2
    const sortOrder= r.uint32(19);
    if (name) achievementCats[id] = { name, parentId: parentId === 0xFFFFFFFF ? null : parentId, sortOrder };
  }
  console.log(`[dbc] Loaded ${Object.keys(achievementCats).length} achievement categories from Achievement_Category.dbc`);
}

function loadAchievements() {
  if (achievementData !== null) return;
  const dir = dbcDir();
  achievementData = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'Achievement.dbc'));
  if (!records) return;
  for (const r of records) {
    const id         = r.uint32(0);
    const name       = r.locString(4);  // name[enUS] = field 4
    const categoryId = r.uint32(38);
    const points     = r.uint32(39);
    if (name) achievementData[id] = { name, categoryId, points };
  }
  console.log(`[dbc] Loaded ${Object.keys(achievementData).length} achievements from Achievement.dbc`);
}

function loadCharTitles() {
  if (charTitleData !== null) return;
  const dir = dbcDir();
  charTitleData = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'CharTitles.dbc'));
  if (!records) return;
  for (const r of records) {
    const id            = r.uint32(0);
    const maleName      = r.locString(2);   // Name_lang[enUS]  — field 2
    const femaleName    = r.locString(19);  // Name1_lang[enUS] — field 19
    const titleBitIndex = r.uint32(36);
    if (maleName || femaleName) {
      charTitleData[titleBitIndex] = { id, maleName, femaleName };
    }
  }
  console.log(`[dbc] Loaded ${Object.keys(charTitleData).length} titles from CharTitles.dbc`);
}

function loadAuctionHouses() {
  if (auctionHouseData !== null) return;
  const dir = dbcDir();
  auctionHouseData = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'AuctionHouse.dbc'));
  if (!records) return;
  for (const r of records) {
    const id              = r.uint32(0);
    const factionId       = r.uint32(1);
    const depositRate     = r.uint32(2);
    const consignmentRate = r.uint32(3);
    const name            = r.locString(4);  // Name_lang[enUS] = field 4
    auctionHouseData[id] = { name: name || `Auction House #${id}`, factionId, depositRate, consignmentRate };
  }
  console.log(`[dbc] Loaded ${Object.keys(auctionHouseData).length} auction houses from AuctionHouse.dbc`);
}

function loadBattlegroundNames() {
  if (bgNames !== null) return;
  const dir = dbcDir();
  bgNames = {};
  bgNamesAll = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'BattlemasterList.dbc'));
  if (!records) return;
  for (const r of records) {
    const id           = r.uint32(0);
    const instanceType = r.uint32(9);   // InstanceType: field 9 (3 = battleground)
    const name         = r.locString(11);  // Name_lang[enUS] = field 11
    if (name) {
      bgNamesAll[id] = name;
      if (instanceType === 3) {
        bgNames[id] = name;
      }
    }
  }
  console.log(`[dbc] Loaded ${Object.keys(bgNames).length} battleground names (${Object.keys(bgNamesAll).length} total incl. arenas) from BattlemasterList.dbc`);
}

function loadSpellNames() {
  if (spellNames !== null) return;
  const dir = dbcDir();
  spellNames = {};
  if (!dir) return;
  const records = parseDBC(path.join(dir, 'Spell.dbc'));
  if (!records) return;
  for (const r of records) {
    const id   = r.uint32(0);
    const name = r.locString(136);  // SpellName_lang[enUS] — field 136
    if (id && name) spellNames[id] = name;
  }
  console.log(`[dbc] Loaded ${Object.keys(spellNames).length} spell names from Spell.dbc`);
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

function getRaceName(id) {
  if (raceNames === null) loadRaceNames();
  return raceNames[id] || null;
}

function getClassName(id) {
  if (classNames === null) loadClassNames();
  return classNames[id] || null;
}

function getAllRaces() {
  if (raceNames === null) loadRaceNames();
  return raceNames;
}

function getAllClasses() {
  if (classNames === null) loadClassNames();
  return classNames;
}

function getFactionName(id) {
  if (factionNames === null) loadFactionNames();
  return factionNames[id] || null;
}

function getAllFactions() {
  if (factionNames === null) loadFactionNames();
  return factionNames;
}

function getAchievementCategories() {
  if (achievementCats === null) loadAchievementCategories();
  return achievementCats;
}

function getAchievements() {
  if (achievementData === null) loadAchievements();
  return achievementData;
}

function getAllCharTitles() {
  if (charTitleData === null) loadCharTitles();
  return charTitleData;
}

function getAuctionHouseName(id) {
  if (auctionHouseData === null) loadAuctionHouses();
  return auctionHouseData[id]?.name || null;
}

function getAuctionHouse(id) {
  if (auctionHouseData === null) loadAuctionHouses();
  return auctionHouseData[id] || null;
}

function getAllAuctionHouses() {
  if (auctionHouseData === null) loadAuctionHouses();
  return auctionHouseData;
}

function getSpellName(id) {
  if (spellNames === null) loadSpellNames();
  return spellNames[id] || null;
}

function getAllSpells() {
  if (spellNames === null) loadSpellNames();
  return spellNames;
}

function getBattlegroundName(id) {
  if (bgNamesAll === null) loadBattlegroundNames();
  return bgNamesAll[id] || null;
}

function getAllBattlegrounds() {
  if (bgNames === null) loadBattlegroundNames();
  return bgNames;
}

/** Call once at server startup to eager-load all tables. */
function init() {
  if (!dbcDir()) {
    console.log('[dbc] DBC_PATH not configured — DBC name resolution disabled');
    return;
  }
  try { loadMapNames();              } catch (e) { console.warn('[dbc] Map.dbc load error:', e.message); }
  try { loadAreaNames();             } catch (e) { console.warn('[dbc] AreaTable.dbc load error:', e.message); }
  try { loadRaceNames();             } catch (e) { console.warn('[dbc] ChrRaces.dbc load error:', e.message); }
  try { loadClassNames();            } catch (e) { console.warn('[dbc] ChrClasses.dbc load error:', e.message); }
  try { loadFactionNames();          } catch (e) { console.warn('[dbc] Faction.dbc load error:', e.message); }
  try { loadAchievementCategories(); } catch (e) { console.warn('[dbc] Achievement_Category.dbc load error:', e.message); }
  try { loadAchievements();          } catch (e) { console.warn('[dbc] Achievement.dbc load error:', e.message); }
  try { loadCharTitles();            } catch (e) { console.warn('[dbc] CharTitles.dbc load error:', e.message); }
  try { loadBattlegroundNames();     } catch (e) { console.warn('[dbc] BattlemasterList.dbc load error:', e.message); }
  try { loadAuctionHouses();          } catch (e) { console.warn('[dbc] AuctionHouse.dbc load error:', e.message); }
  try { loadSpellNames();            } catch (e) { console.warn('[dbc] Spell.dbc load error:', e.message); }
}

module.exports = {
  init,
  getMapName, getAreaName, getAllMaps, getAllAreas,
  getRaceName, getClassName, getAllRaces, getAllClasses,
  getFactionName, getAllFactions,
  getAchievementCategories, getAchievements,
  getAllCharTitles,
  getAuctionHouseName, getAuctionHouse, getAllAuctionHouses,
  getSpellName, getAllSpells,
  getBattlegroundName, getAllBattlegrounds,
};
