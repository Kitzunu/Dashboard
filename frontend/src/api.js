const DEFAULT_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${DEFAULT_HOST}:3001`;

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
  logout: (reason = 'manual') => request('POST', '/api/auth/logout', { reason }),
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

  getThresholds: ()      => request('GET', '/api/thresholds'),
  saveThresholds: (data) => request('PUT', '/api/thresholds', data),

  getAnnouncements:  ()                   => request('GET',  '/api/announcements/history'),
  sendAnnouncement:  (type, message)      => request('POST', '/api/announcements', { type, message }),

  getAutobroadcasts:    ()           => request('GET',    '/api/autobroadcast'),
  createAutobroadcast:  (text, weight) => request('POST', '/api/autobroadcast', { text, weight }),
  updateAutobroadcast:  (id, text, weight) => request('PUT', `/api/autobroadcast/${id}`, { text, weight }),
  deleteAutobroadcast:  (id)         => request('DELETE', `/api/autobroadcast/${id}`),

  searchAccounts:    (q, page = 1) => request('GET',   `/api/accounts?q=${encodeURIComponent(q)}&page=${page}`),
  getAccount:        (id)         => request('GET',   `/api/accounts/${id}`),
  createAccount:     (username, password) => request('POST', '/api/accounts', { username, password }),
  setGMLevel:        (id, gmlevel)    => request('PATCH',   `/api/accounts/${id}/gmlevel`,   { gmlevel }),
  setAccountLock:    (id, locked)     => request('PATCH',   `/api/accounts/${id}/lock`,      { locked }),
  setExpansion:      (id, expansion)  => request('PATCH',   `/api/accounts/${id}/expansion`, { expansion }),
  setEmail:          (id, email)      => request('PATCH',   `/api/accounts/${id}/email`,     { email }),
  setAccountFlags:   (id, flags)      => request('PATCH',   `/api/accounts/${id}/flags`,     { flags }),
  resetPassword:     (id, password)   => request('POST',    `/api/accounts/${id}/password`,  { password }),
  deleteAccount:     (id)             => request('DELETE',  `/api/accounts/${id}`),
  muteCharacter:     (name, minutes, reason) => request('POST', '/api/accounts/mute',   { name, minutes, reason }),
  unmuteCharacter:   (name)           => request('POST',    '/api/accounts/unmute',     { name }),

  getMOTD:         ()             => request('GET',  '/api/servertools/motd'),
  setMOTD:         (motd)        => request('PUT',  '/api/servertools/motd', { motd }),
  restartServer:   (delay)       => request('POST', '/api/servertools/restart', { delay }),
  cancelRestart:   ()            => request('POST', '/api/servertools/restart/cancel'),

  sendMail:        (player, subject, body)          => request('POST', '/api/mail', { type: 'text', player, subject, body }),
  sendMailItems:   (player, subject, body, items)   => request('POST', '/api/mail', { type: 'items', player, subject, body, items }),
  sendMailMoney:   (player, subject, body, money)   => request('POST', '/api/mail', { type: 'money', player, subject, body, money }),

  getConfigs:      ()             => request('GET', '/api/config'),
  getConfig:       (name)         => request('GET', `/api/config/${name}`),
  saveConfig:      (name, content) => request('PUT', `/api/config/${name}`, { content }),

  // DBC data
  getDBCStatus:   () => request('GET', '/api/dbc/status'),
  getDBCMaps:     () => request('GET', '/api/dbc/maps'),
  getDBCAreas:    () => request('GET', '/api/dbc/areas'),
  getDBCRaces:    () => request('GET', '/api/dbc/races'),
  getDBCClasses:  () => request('GET', '/api/dbc/classes'),

  // Mail Server Templates
  getMailServerTemplates:  ()          => request('GET',    '/api/mailserver'),
  getMailServerTemplate:   (id)        => request('GET',    `/api/mailserver/${id}`),
  createMailServerTemplate:(data)      => request('POST',   '/api/mailserver', data),
  updateMailServerTemplate:(id, data)  => request('PUT',    `/api/mailserver/${id}`, data),
  deleteMailServerTemplate:(id)        => request('DELETE', `/api/mailserver/${id}`),
  addMailServerItem:       (id, data)  => request('POST',   `/api/mailserver/${id}/items`, data),
  deleteMailServerItem:    (id, itemId)=> request('DELETE', `/api/mailserver/${id}/items/${itemId}`),
  addMailServerCondition:  (id, data)  => request('POST',   `/api/mailserver/${id}/conditions`, data),
  deleteMailServerCondition:(id, condId)=>request('DELETE', `/api/mailserver/${id}/conditions/${condId}`),
  getMailServerRecipients: (id)        => request('GET',    `/api/mailserver/${id}/recipients`),

  getLagReports: (page, lagType, minLatency) => {
    const params = new URLSearchParams({ page: page || 1 });
    if (lagType != null && lagType !== 'all') params.set('lagType', lagType);
    if (minLatency > 0) params.set('minLatency', minLatency);
    return request('GET', `/api/lagreports?${params}`);
  },
  getLagStats:      ()   => request('GET',    '/api/lagreports/stats'),
  deleteLagReport:  (id) => request('DELETE', `/api/lagreports/${id}`),
  clearLagReports:  ()   => request('DELETE', '/api/lagreports'),

  getSettings:        ()      => request('GET', '/api/settings'),
  saveSettings:       (data)  => request('PUT', '/api/settings', data),
  testDiscordWebhook: ()      => request('POST', '/api/settings/discord/test'),
  restartBackend:     ()      => request('POST', '/api/settings/restart'),

  getEnvSettings:     ()      => request('GET', '/api/env-settings'),
  saveEnvSettings:    (data)  => request('PUT', '/api/env-settings', data),

  getAuditLog: (page = 1, { user = '', actions = [], success = '', search = '' } = {}) =>
    request('GET', `/api/audit-log?page=${page}&user=${encodeURIComponent(user)}&actions=${encodeURIComponent(actions.join(','))}&success=${success}&search=${encodeURIComponent(search)}`),

  getSpamReports: (page = 1, type = 'all', search = '') =>
    request('GET', `/api/spamreports?page=${page}&type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`),
  deleteSpamReport: (id) => request('DELETE', `/api/spamreports/${id}`),
  clearSpamReports: () => request('DELETE', '/api/spamreports'),

  getChannels:       () => request('GET', '/api/channels'),
  getChannel:        (id) => request('GET', `/api/channels/${id}`),
  unbanChannelPlayer:(channelId, guid) => request('DELETE', `/api/channels/${channelId}/bans/${guid}`),
  deleteChannel:     (id) => request('DELETE', `/api/channels/${id}`),

  getBugReports:  (page, feedbackType, state, search) => {
    const params = new URLSearchParams({ page: page || 1 });
    if (feedbackType != null && feedbackType !== 'all') params.set('feedbackType', feedbackType);
    if (state  != null && state  !== 'all') params.set('state',  state);
    if (search != null && search !== '')    params.set('search', search);
    return request('GET', `/api/bugreports?${params}`);
  },
  getBugReport:      (id)   => request('GET',   `/api/bugreports/${id}`),
  updateBugReport:   (id, updates) => request('PATCH', `/api/bugreports/${id}`, updates),

  getMutes:   ()   => request('GET',    '/api/mutes'),
  unmute:     (id) => request('DELETE', `/api/mutes/${id}`),

  getScheduledTasks:    ()        => request('GET',    '/api/scheduled-tasks'),
  createScheduledTask:  (data)    => request('POST',   '/api/scheduled-tasks', data),
  updateScheduledTask:  (id, data)=> request('PUT',    `/api/scheduled-tasks/${id}`, data),
  deleteScheduledTask:  (id)      => request('DELETE', `/api/scheduled-tasks/${id}`),
  runScheduledTask:     (id)      => request('POST',   `/api/scheduled-tasks/${id}/run`),

  searchCharacters: (q)    => request('GET', `/api/characters/search?q=${encodeURIComponent(q)}`),
  getCharacter:     (guid) => request('GET', `/api/characters/${guid}`),

  getGuilds:     ()   => request('GET', '/api/guilds'),
  getGuild:      (id) => request('GET', `/api/guilds/${id}`),
  getGuildBank:  (id) => request('GET', `/api/guilds/${id}/bank`),

  getNameFilters:    ()           => request('GET',    '/api/namefilters'),
  addNameFilter:     (type, name) => request('POST',   `/api/namefilters/${type}`, { name }),
  removeNameFilter:  (type, name) => request('DELETE', `/api/namefilters/${type}/${encodeURIComponent(name)}`),

  getBans: () => request('GET', '/api/bans'),
  banTarget: (type, target, duration, reason) =>
    request('POST', '/api/bans', { type, target, duration, reason }),
  unbanAccount:   (id)   => request('DELETE', `/api/bans/accounts/${id}`),
  unbanCharacter: (guid) => request('DELETE', `/api/bans/characters/${guid}`),
  unbanIp:        (ip)   => request('DELETE', `/api/bans/ips/${encodeURIComponent(ip)}`),
};
