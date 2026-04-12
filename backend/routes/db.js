const express = require('express');
const { requireGMLevel } = require('../middleware/auth');
const { authPool } = require('../db');
const { audit } = require('../audit');

const router = express.Router();

function getPool(req, database) {
  switch (database) {
    case 'auth':       return authPool;
    case 'world':      return req.worldPool;
    case 'characters': return req.charPool;
    default:           return req.charPool;
  }
}

router.post('/query', requireGMLevel(3), async (req, res) => {
  const { query, database } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const pool = getPool(req, database);

  audit(req, 'dbquery.execute', `db=${database || 'characters'} query=${query.trim().slice(0, 200)}`);
  try {
    const [rows, fields] = await pool.query(query.trim());
    // Handle non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
    if (!fields) {
      return res.json({ rows: [], columns: [], affectedRows: rows.affectedRows, info: rows.info });
    }
    const columns = fields.map((f) => f.name);
    // Serialize BigInt values
    const serialized = rows.map((row) =>
      Object.fromEntries(columns.map((c) => [c, row[c] != null ? String(row[c]) : null]))
    );
    res.json({ rows: serialized, columns });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
