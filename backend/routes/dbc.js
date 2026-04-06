const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const dbc = require('../dbc');

const router = express.Router();

// GET /api/dbc/maps  — { [id]: name } lookup for all maps
router.get('/maps', requireGMLevel(1), (req, res) => {
  try {
    const maps = dbc.getAllMaps();
    res.json({ available: Object.keys(maps).length > 0, maps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/areas  — { [id]: name } lookup for all areas/zones
router.get('/areas', requireGMLevel(1), (req, res) => {
  try {
    const areas = dbc.getAllAreas();
    res.json({ available: Object.keys(areas).length > 0, areas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/races  — { [id]: name } lookup for all races
router.get('/races', requireGMLevel(1), (req, res) => {
  try {
    const races = dbc.getAllRaces();
    res.json({ available: Object.keys(races).length > 0, races });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/classes  — { [id]: name } lookup for all classes
router.get('/classes', requireGMLevel(1), (req, res) => {
  try {
    const classes = dbc.getAllClasses();
    res.json({ available: Object.keys(classes).length > 0, classes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/battlegrounds  — { [id]: name } lookup for all battlegrounds
router.get('/battlegrounds', requireGMLevel(1), (req, res) => {
  try {
    const battlegrounds = dbc.getAllBattlegrounds();
    res.json({ available: Object.keys(battlegrounds).length > 0, battlegrounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/auctionhouses  — { [id]: { name, factionId, depositRate, consignmentRate } }
router.get('/auctionhouses', requireGMLevel(1), (req, res) => {
  try {
    const auctionhouses = dbc.getAllAuctionHouses();
    res.json({ available: Object.keys(auctionhouses).length > 0, auctionhouses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dbc/status  — whether DBC data is loaded
router.get('/status', requireGMLevel(1), (req, res) => {
  const maps    = dbc.getAllMaps();
  const areas   = dbc.getAllAreas();
  const races   = dbc.getAllRaces();
  const classes = dbc.getAllClasses();
  const bgs     = dbc.getAllBattlegrounds();
  const ahs     = dbc.getAllAuctionHouses();
  res.json({
    configured:       !!process.env.DBC_PATH,
    dbcPath:          process.env.DBC_PATH || null,
    mapCount:         Object.keys(maps).length,
    areaCount:        Object.keys(areas).length,
    raceCount:        Object.keys(races).length,
    classCount:       Object.keys(classes).length,
    bgCount:          Object.keys(bgs).length,
    auctionHouseCount: Object.keys(ahs).length,
  });
});

module.exports = router;
