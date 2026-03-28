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
  stopServer: (name, mode, delay) => request('POST', `/api/servers/${name}/stop`, { mode, delay }),
  setAutoRestart: (name, enabled) => request('POST', `/api/servers/${name}/autorestart`, { enabled }),
  getServerLogs: (name) => request('GET', `/api/servers/${name}/logs`),

  sendCommand: (command) => request('POST', '/api/console/command', { command }),

  getPlayers: () => request('GET', '/api/players'),
  kickPlayer: (name, reason) => request('POST', `/api/players/${encodeURIComponent(name)}/kick`, { reason }),
  banPlayer: (name, duration, reason, type = 'character', target) =>
    request('POST', `/api/players/${encodeURIComponent(name)}/ban`, { type, target: target || name, duration, reason }),

  dbQuery: (query, database) => request('POST', '/api/db/query', { query, database }),

  getPlayerCount: () => request('GET', '/api/players/count'),

  getTickets:      ()        => request('GET',  '/api/tickets'),
  getAllTickets:    ()        => request('GET',  '/api/tickets/all'),
  getTicketCount:  ()        => request('GET',  '/api/tickets/count'),
  closeTicket:     (id)          => request('POST', `/api/tickets/${id}/close`),
  respondTicket:   (id, response) => request('POST', `/api/tickets/${id}/respond`, { response }),
  commentTicket:   (id, comment)  => request('POST', `/api/tickets/${id}/comment`, { comment }),
  assignTicket:    (id, gm)       => request('POST', `/api/tickets/${id}/assign`,  { gm }),
  unassignTicket:  (id)      => request('POST', `/api/tickets/${id}/unassign`),
  escalateTicket:  (id)      => request('POST', `/api/tickets/${id}/escalate`),
  deescalateTicket:(id)      => request('POST', `/api/tickets/${id}/deescalate`),

  getOverview: () => request('GET', '/api/overview'),

  getAnnouncements:  ()                   => request('GET',  '/api/announcements/history'),
  sendAnnouncement:  (type, message)      => request('POST', '/api/announcements', { type, message }),

  getAutobroadcasts:    ()           => request('GET',    '/api/autobroadcast'),
  createAutobroadcast:  (text, weight) => request('POST', '/api/autobroadcast', { text, weight }),
  updateAutobroadcast:  (id, text, weight) => request('PUT', `/api/autobroadcast/${id}`, { text, weight }),
  deleteAutobroadcast:  (id)         => request('DELETE', `/api/autobroadcast/${id}`),

  searchAccounts:    (q)          => request('GET',   `/api/accounts?q=${encodeURIComponent(q)}`),
  getAccount:        (id)         => request('GET',   `/api/accounts/${id}`),
  createAccount:     (username, password) => request('POST', '/api/accounts', { username, password }),
  setGMLevel:        (id, gmlevel)  => request('PATCH', `/api/accounts/${id}/gmlevel`, { gmlevel }),
  setAccountLock:    (id, locked)   => request('PATCH', `/api/accounts/${id}/lock`, { locked }),
  resetPassword:     (id, password) => request('POST',  `/api/accounts/${id}/password`, { password }),

  getConfigs:      ()             => request('GET', '/api/config'),
  getConfig:       (name)         => request('GET', `/api/config/${name}`),
  saveConfig:      (name, content) => request('PUT', `/api/config/${name}`, { content }),

  getBans: () => request('GET', '/api/bans'),
  banTarget: (type, target, duration, reason) =>
    request('POST', '/api/bans', { type, target, duration, reason }),
  unbanAccount:   (id)   => request('DELETE', `/api/bans/accounts/${id}`),
  unbanCharacter: (guid) => request('DELETE', `/api/bans/characters/${guid}`),
  unbanIp:        (ip)   => request('DELETE', `/api/bans/ips/${encodeURIComponent(ip)}`),
};
