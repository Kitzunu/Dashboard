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
const { authenticateToken } = require('./middleware/auth');
const processManager = require('./processManager');

const app = express();
const httpServer = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/servers', authenticateToken, serverRoutes);
app.use('/api/players', authenticateToken, playerRoutes);
app.use('/api/console', authenticateToken, consoleRoutes);
app.use('/api/db', authenticateToken, dbRoutes);

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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`AzerothCore Dashboard backend running on http://localhost:${PORT}`);
});
