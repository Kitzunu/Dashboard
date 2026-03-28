require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mysql2 = require('mysql2/promise');

const baseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'acore',
  password: process.env.DB_PASSWORD || 'acore',
  waitForConnections: true,
  connectionLimit: 10,
};

const authPool = mysql2.createPool({ ...baseConfig, database: process.env.AUTH_DB || 'acore_auth' });
const worldPool = mysql2.createPool({ ...baseConfig, database: process.env.WORLD_DB || 'acore_world' });
const charPool = mysql2.createPool({ ...baseConfig, database: process.env.CHARACTERS_DB || 'acore_characters' });

module.exports = { authPool, worldPool, charPool };
