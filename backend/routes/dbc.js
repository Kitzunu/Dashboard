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

// GET /api/dbc/status  — whether DBC data is loaded
router.get('/status', requireGMLevel(1), (req, res) => {
  const maps  = dbc.getAllMaps();
  const areas = dbc.getAllAreas();
  res.json({
    configured: !!process.env.DBC_PATH,
    dbcPath:    process.env.DBC_PATH || null,
    mapCount:   Object.keys(maps).length,
    areaCount:  Object.keys(areas).length,
  });
});

module.exports = router;
