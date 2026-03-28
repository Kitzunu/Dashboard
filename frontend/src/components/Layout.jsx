import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import { connectSocket, disconnectSocket } from '../socket.js';
import { api } from '../api.js';
import ConsolePage from './ConsolePage.jsx';
import ServersPage from './ServersPage.jsx';
import PlayersPage from './PlayersPage.jsx';
import DBQueryPage from './DBQueryPage.jsx';

const GM_LABELS = {
  1: 'Moderator',
  2: 'Game Master',
  3: 'Administrator',
  4: 'Console',
};

const NAV = [
  { id: 'console', label: '🖥 Console', minLevel: 1 },
  { id: 'players', label: '👥 Players', minLevel: 1 },
  { id: 'servers', label: '⚙ Servers', minLevel: 3 },
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

  useEffect(() => {
    // Load initial server status
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

  const navItems = NAV.filter((item) => auth.gmlevel >= item.minLevel);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚔</span>
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
              {item.label}
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
        {page === 'players' && <PlayersPage auth={auth} />}
        {page === 'servers' && (
          <ServersPage serverStatus={serverStatus} setServerStatus={setServerStatus} />
        )}
        {page === 'dbquery' && <DBQueryPage />}
      </main>
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
