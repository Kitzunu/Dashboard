import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../socket.js';
import { api } from '../api.js';

const ServerContext = createContext(null);

export function useSocket() {
  return useContext(ServerContext).socket;
}

export function useServerStatus() {
  const { serverStatus, setServerStatus, worldservers, playerCount, ticketCount } = useContext(ServerContext);
  return { serverStatus, setServerStatus, worldservers, playerCount, ticketCount };
}

export function ServerProvider({ token, children }) {
  const [socket, setSocket] = useState(null);
  const [serverStatus, setServerStatus] = useState({
    worldserver: { running: false },
    authserver: { running: false },
  });
  const [worldservers, setWorldservers] = useState([{ id: 'worldserver', name: 'World Server' }]);
  const [playerCount, setPlayerCount] = useState(null);
  const [ticketCount, setTicketCount] = useState(null);
  const worldRunningRef = useRef(false);

  useEffect(() => {
    api.getServerStatus()
      .then((status) => setServerStatus((prev) => ({ ...prev, ...status })))
      .catch(() => {});

    api.getServerList()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setWorldservers(list);
          setServerStatus((prev) => {
            const next = { ...prev };
            for (const ws of list) {
              if (!next[ws.id]) next[ws.id] = { running: false };
            }
            return next;
          });
        }
      })
      .catch(() => {});

    const s = connectSocket(token);
    setSocket(s);

    s.on('server-status', ({ server, running }) => {
      setServerStatus((prev) => ({ ...prev, [server]: { ...prev[server], running } }));
    });

    return () => disconnectSocket();
  }, [token]);

  // Keep ref in sync so polling closure always sees current running state
  const anyWorldRunning = worldservers.some((ws) => serverStatus[ws.id]?.running);
  useEffect(() => {
    worldRunningRef.current = anyWorldRunning;
    if (!anyWorldRunning) setPlayerCount(0);
  }, [anyWorldRunning]);

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

  return (
    <ServerContext.Provider value={{ socket, serverStatus, setServerStatus, worldservers, playerCount, ticketCount }}>
      {children}
    </ServerContext.Provider>
  );
}
