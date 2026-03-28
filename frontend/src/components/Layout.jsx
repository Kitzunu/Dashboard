import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App.jsx';
import { connectSocket, disconnectSocket } from '../socket.js';
import { api } from '../api.js';
import ConsolePage from './ConsolePage.jsx';
import ServersPage from './ServersPage.jsx';
import PlayersPage from './PlayersPage.jsx';
import DBQueryPage from './DBQueryPage.jsx';
import BansPage from './BansPage.jsx';

const GM_LABELS = {
  1: 'Moderator',
  2: 'Game Master',
  3: 'Administrator',
  4: 'Console',
};

const NAV = [
  { id: 'console', label: '🖥 Console', minLevel: 1 },
  { id: 'players', label: '👥 Players', minLevel: 1 },
  { id: 'bans',    label: '🔨 Bans',    minLevel: 2 },
  { id: 'servers', label: '⚙ Servers',  minLevel: 3 },
  { id: 'dbquery', label: '🗄 DB Query', minLevel: 3 },
];

export default function Layout() {
  const { auth, logout } = useAuth();
  const [page, setPage] = useState('console');
  const [socket, setSocket] = useState(null);
  const [serverStatus, setServerStatus] = useState({
    worldserver: { running: false },
    authserver: { running: false },
  });
  const [playerCount, setPlayerCount] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    api.getServerStatus()
      .then(setServerStatus)
      .catch(() => {});

    const s = connectSocket(auth.token);
    setSocket(s);

    s.on('server-status', ({ server, running }) => {
      setServerStatus((prev) => ({ ...prev, [server]: { running } }));
    });

    return () => disconnectSocket();
  }, [auth.token]);

  // Poll player count every 30s
  useEffect(() => {
    const fetchCount = () => {
      api.getPlayerCount()
        .then((d) => setPlayerCount(d.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clear count when world goes offline
  useEffect(() => {
    if (!serverStatus.worldserver.running) setPlayerCount(0);
  }, [serverStatus.worldserver.running]);

  // Toast listener
  useEffect(() => {
    const handler = (e) => {
      const id = ++toastId.current;
      const { text, type } = e.detail;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  const navItems = NAV.filter((item) => auth.gmlevel >= item.minLevel);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">
            <img src="../../img/icon.png" alt="image" width="38" height="auto" />
          </span>
          <div>
            <div className="brand-name">AzerothCore</div>
            <div className="brand-sub">Dashboard</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              {item.id === 'players' && playerCount != null && (
                <span className={`nav-badge ${playerCount > 0 ? 'nav-badge-active' : ''}`}>
                  {playerCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="server-status-row">
            <StatusDot label="World" running={serverStatus.worldserver.running} />
            <StatusDot label="Auth" running={serverStatus.authserver.running} />
          </div>
          <div className="user-row">
            <div>
              <div className="user-name">{auth.username}</div>
              <div className="user-level">{GM_LABELS[auth.gmlevel] || `Level ${auth.gmlevel}`}</div>
            </div>
            <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page === 'console' && <ConsolePage socket={socket} auth={auth} />}
        {page === 'players' && <PlayersPage auth={auth} serverStatus={serverStatus} />}
        {page === 'bans'    && <BansPage />}
        {page === 'servers' && <ServersPage serverStatus={serverStatus} setServerStatus={setServerStatus} />}
        {page === 'dbquery' && <DBQueryPage />}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

function StatusDot({ label, running }) {
  return (
    <div className="status-dot-group">
      <span className={`dot ${running ? 'dot-green' : 'dot-red'}`} />
      <span className="dot-label">{label}</span>
    </div>
  );
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
