import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import { connectSocket, disconnectSocket } from '../socket.js';
import { api } from '../api.js';
import ConsolePage from './ConsolePage.jsx';
import ServersPage from './ServersPage.jsx';
import PlayersPage from './PlayersPage.jsx';
import DBQueryPage from './DBQueryPage.jsx';
import BansPage from './BansPage.jsx';
import TicketsPage from './TicketsPage.jsx';
import ConfigPage from './ConfigPage.jsx';
import HomePage from './HomePage.jsx';
import AnnouncePage from './AnnouncePage.jsx';
import AutobroadcastPage from './AutobroadcastPage.jsx';
import AccountsPage from './AccountsPage.jsx';
import MailPage from './MailPage.jsx';
import BugReportsPage from './BugReportsPage.jsx';
import LagReportsPage from './LagReportsPage.jsx';
import MailServerPage from './MailServerPage.jsx';
import ChannelsPage from './ChannelsPage.jsx';
import SpamReportsPage from './SpamReportsPage.jsx';
import AuditLogPage from './AuditLogPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import { GM_LABELS } from '../constants.js';

const NAV_GROUPS = [
  {
    group: 'Server',
    items: [
      { id: 'home',          label: '📊 Overview',     minLevel: 1 },
      { id: 'console',       label: '🖥 Console',       minLevel: 1 },
      { id: 'servers',       label: '⚙ Servers',        minLevel: 3 },
      { id: 'autobroadcast', label: '📣 Autobroadcast', minLevel: 2 },
      { id: 'mailserver',    label: '📬 Mail Server',   minLevel: 3 },
      { id: 'dbquery',       label: '🗄 DB Query',       minLevel: 3 },
      { id: 'config',        label: '📄 Config',         minLevel: 3 },
    ],
  },
  {
    group: 'Game',
    items: [
      { id: 'players',  label: '👥 Players',  minLevel: 1 },
      { id: 'tickets',  label: '🎫 Tickets',  minLevel: 1 },
      { id: 'bans',     label: '🔨 Bans',     minLevel: 2 },
      { id: 'announce', label: '📢 Announce', minLevel: 2 },
      { id: 'accounts',  label: '👤 Accounts',  minLevel: 2 },
      { id: 'mail',      label: '✉ Send Mail',  minLevel: 2 },
      { id: 'channels',  label: '💬 Channels',  minLevel: 1 },
    ],
  },
  {
    group: 'Reports',
    items: [
      { id: 'lagreports',  label: '📶 Lag Reports',  minLevel: 1 },
      { id: 'bugreports',  label: '🐛 Bug Reports',  minLevel: 1 },
      { id: 'spamreports', label: '🚫 Spam Reports', minLevel: 1 },
    ],
  },
  {
    group: 'Dashboard',
    items: [
      { id: 'audit-log', label: '📋 Audit Log',  minLevel: 3 },
      { id: 'settings',  label: '⚙ Settings',    minLevel: 3 },
    ],
  },
];

const WARN_BEFORE_SEC = 60;

function useIdleTimeout(timeoutMinutes, onLogout) {
  const [showWarning, setShowWarning]   = useState(false);
  const [countdown, setCountdown]       = useState(WARN_BEFORE_SEC);
  const timers        = useRef({ warn: null, logout: null, tick: null });
  const warningActive = useRef(false);

  const clearAll = () => {
    clearTimeout(timers.current.warn);
    clearTimeout(timers.current.logout);
    clearInterval(timers.current.tick);
  };

  const startTimers = useCallback(() => {
    if (!timeoutMinutes || timeoutMinutes <= 0) return;
    clearAll();
    const totalMs = timeoutMinutes * 60 * 1000;
    const warnMs  = Math.max(0, totalMs - WARN_BEFORE_SEC * 1000);

    timers.current.warn = setTimeout(() => {
      warningActive.current = true;
      setShowWarning(true);
      setCountdown(WARN_BEFORE_SEC);
      timers.current.tick = setInterval(
        () => setCountdown((c) => c - 1),
        1000
      );
    }, warnMs);

    timers.current.logout = setTimeout(() => {
      clearAll();
      onLogout('idle_timeout');
    }, totalMs);
  }, [timeoutMinutes, onLogout]);

  const resetIdle = useCallback(() => {
    if (warningActive.current) return;
    startTimers();
  }, [startTimers]);

  const stayLoggedIn = useCallback(() => {
    warningActive.current = false;
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!timeoutMinutes || timeoutMinutes <= 0) return;
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    let lastActivity = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 5000) return;
      lastActivity = now;
      resetIdle();
    };
    EVENTS.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    startTimers();
    return () => {
      EVENTS.forEach((e) => document.removeEventListener(e, handleActivity));
      clearAll();
    };
  }, [timeoutMinutes, resetIdle, startTimers]);

  return { showWarning, countdown, stayLoggedIn };
}

export default function Layout() {
  const { auth, logout } = useAuth();
  const [page, setPage] = useState('home');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [socket, setSocket] = useState(null);
  const [serverStatus, setServerStatus] = useState({
    worldserver: { running: false },
    authserver: { running: false },
  });
  const [playerCount, setPlayerCount]   = useState(null);
  const [ticketCount, setTicketCount]   = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId        = useRef(0);
  const worldRunningRef = useRef(false); // tracks live world status for polling closure

  const { showWarning, countdown, stayLoggedIn } = useIdleTimeout(
    auth.idleTimeoutMinutes || 0,
    logout
  );

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

  // Keep ref in sync so the polling closure always sees the current running state
  useEffect(() => {
    worldRunningRef.current = serverStatus.worldserver.running;
    if (!serverStatus.worldserver.running) setPlayerCount(0);
  }, [serverStatus.worldserver.running]);

  // Poll player count every 30s — skip DB call and force 0 when world is offline
  useEffect(() => {
    const fetchCount = () => {
      if (!worldRunningRef.current) { setPlayerCount(0); return; }
      api.getPlayerCount()
        .then((d) => setPlayerCount(d.count))
        .catch(() => setPlayerCount(0));
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Poll ticket count every 60s
  useEffect(() => {
    const fetchTicketCount = () => {
      api.getTicketCount()
        .then((d) => setTicketCount(d.count))
        .catch(() => {});
    };
    fetchTicketCount();
    const interval = setInterval(fetchTicketCount, 60000);
    return () => clearInterval(interval);
  }, []);

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
          {NAV_GROUPS.map(({ group, items }) => {
            const visible = items.filter((item) => auth.gmlevel >= item.minLevel);
            if (visible.length === 0) return null;
            const collapsed = !!collapsedGroups[group];
            const toggle = () => setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
            return (
              <div key={group} className="nav-group">
                <button className="nav-group-label" onClick={toggle}>
                  <span>{group}</span>
                  <span className={`nav-group-chevron ${collapsed ? 'collapsed' : ''}`}>›</span>
                </button>
                {!collapsed && visible.map((item) => (
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
                    {item.id === 'tickets' && ticketCount != null && (
                      <span className={`nav-badge ${ticketCount > 0 ? 'nav-badge-warn' : ''}`}>
                        {ticketCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
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
            <button onClick={() => logout('manual')} className="btn btn-ghost btn-sm">Logout</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page === 'home'          && <HomePage />}
        {page === 'console'       && <ConsolePage socket={socket} auth={auth} />}
        {page === 'players'       && <PlayersPage auth={auth} serverStatus={serverStatus} />}
        {page === 'tickets'       && <TicketsPage />}
        {page === 'bans'          && <BansPage />}
        {page === 'announce'      && <AnnouncePage />}
        {page === 'accounts'      && <AccountsPage auth={auth} />}
        {page === 'autobroadcast' && <AutobroadcastPage />}
        {page === 'mail'          && <MailPage />}
        {page === 'bugreports'    && <BugReportsPage />}
        {page === 'lagreports'    && <LagReportsPage />}
        {page === 'mailserver'    && <MailServerPage />}
        {page === 'servers'       && <ServersPage serverStatus={serverStatus} setServerStatus={setServerStatus} />}
        {page === 'dbquery'       && <DBQueryPage />}
        {page === 'config'        && <ConfigPage />}
        {page === 'channels'      && <ChannelsPage />}
        {page === 'spamreports'   && <SpamReportsPage />}
        {page === 'audit-log'     && <AuditLogPage />}
        {page === 'settings'      && <SettingsPage />}
      </main>

      <ToastContainer toasts={toasts} />

      {showWarning && (
        <div className="modal-overlay">
          <div className="modal idle-warning-modal">
            <div className="modal-header">
              <h3>Session Expiring</h3>
            </div>
            <div className="modal-body">
              <p>You have been idle and will be automatically logged out in:</p>
              <div className="idle-countdown">{Math.max(0, countdown)}</div>
              <p className="td-muted" style={{ fontSize: 13 }}>Move your mouse or press any key to stay logged in.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={stayLoggedIn}>Stay Logged In</button>
              <button className="btn btn-ghost" onClick={() => logout('manual')}>Log Out Now</button>
            </div>
          </div>
        </div>
      )}
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
