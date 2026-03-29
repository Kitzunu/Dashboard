require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const playerRoutes = require('./routes/players');
const consoleRoutes = require('./routes/console');
const dbRoutes = require('./routes/db');
const banRoutes          = require('./routes/bans');
const ticketRoutes       = require('./routes/tickets');
const configRoutes       = require('./routes/config');
const overviewRoutes     = require('./routes/overview');
const announcementRoutes = require('./routes/announcements');
const autobroadcastRoutes= require('./routes/autobroadcast');
const accountRoutes      = require('./routes/accounts');
const servertoolsRoutes  = require('./routes/servertools');
const mailRoutes         = require('./routes/mail');
const thresholdsRoutes   = require('./routes/thresholds');
const playerHistory      = require('./playerHistory');
const { authenticateToken } = require('./middleware/auth');
const ipAllowlist = require('./middleware/ipAllowlist');
const processManager = require('./processManager');

const app = express();
const httpServer = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use(ipAllowlist);

app.use('/api/auth', authRoutes);
app.use('/api/servers', authenticateToken, serverRoutes);
app.use('/api/players', authenticateToken, playerRoutes);
app.use('/api/console', authenticateToken, consoleRoutes);
app.use('/api/db', authenticateToken, dbRoutes);
app.use('/api/overview',       authenticateToken, overviewRoutes);
app.use('/api/announcements',  authenticateToken, announcementRoutes);
app.use('/api/autobroadcast',  authenticateToken, autobroadcastRoutes);
app.use('/api/accounts',       authenticateToken, accountRoutes);
app.use('/api/bans',           authenticateToken, banRoutes);
app.use('/api/tickets',        authenticateToken, ticketRoutes);
app.use('/api/config',         authenticateToken, configRoutes);
app.use('/api/servertools',    authenticateToken, servertoolsRoutes);
app.use('/api/mail',           authenticateToken, mailRoutes);
app.use('/api/thresholds',     authenticateToken, thresholdsRoutes);

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  socket.on('subscribe', (serverName) => {
    if (['worldserver', 'authserver'].includes(serverName)) {
      socket.join(`console-${serverName}`);
    }
  });
  socket.on('unsubscribe', (serverName) => {
    socket.leave(`console-${serverName}`);
  });
});

processManager.setIO(io);

// Poll player count every 30 s and store in rolling history
const { charPool } = require('./db');
async function pollPlayerCount() {
  try {
    const [rows] = await charPool.query('SELECT COUNT(*) AS count FROM characters WHERE online = 1');
    playerHistory.record(Number(rows[0].count));
  } catch {}
}
pollPlayerCount();
setInterval(pollPlayerCount, 30000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`AzerothCore Dashboard backend running on http://localhost:${PORT}`);
});
