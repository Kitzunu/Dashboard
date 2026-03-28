const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  try {
    const stored = localStorage.getItem('ac_auth');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
}

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request('POST', '/api/auth/login', { username, password }),

  getServerStatus: () => request('GET', '/api/servers/status'),
  startServer: (name) => request('POST', `/api/servers/${name}/start`),
  stopServer: (name) => request('POST', `/api/servers/${name}/stop`),
  getServerLogs: (name) => request('GET', `/api/servers/${name}/logs`),

  sendCommand: (command) => request('POST', '/api/console/command', { command }),

  getPlayers: () => request('GET', '/api/players'),
  kickPlayer: (name, reason) => request('POST', `/api/players/${encodeURIComponent(name)}/kick`, { reason }),
  banPlayer: (name, duration, reason) =>
    request('POST', `/api/players/${encodeURIComponent(name)}/ban`, { duration, reason }),

  dbQuery: (query, database) => request('POST', '/api/db/query', { query, database }),

  getPlayerCount: () => request('GET', '/api/players/count'),

  getBans: () => request('GET', '/api/bans'),
  unbanAccount: (id) => request('DELETE', `/api/bans/${id}`),
};
