const DEFAULT_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const DEFAULT_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol : 'http:';
export const BASE_URL = import.meta.env.VITE_API_URL || `${DEFAULT_PROTOCOL}//${DEFAULT_HOST}:3001`;

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
  restartBackend:     ()      => request('POST', '/api/dashboard/restart/backend'),
  restartAgent:       ()      => request('POST', '/api/dashboard/restart/agent'),
  restartFrontend:    ()      => request('POST', '/api/dashboard/restart/frontend'),
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

  getArenaTeams: ()   => request('GET', '/api/arena'),
  getArenaTeam:  (id) => request('GET', `/api/arena/${id}`),
  getArenaMatches: (id) => request('GET', `/api/arena/${id}/matches`),
  createArenaTeam: (data) => request('POST', '/api/arena', data),
  updateArenaTeam: (id, data) => request('PATCH', `/api/arena/${id}`, data),
  removeArenaMember: (id, guid) => request('DELETE', `/api/arena/${id}/members/${guid}`),
  deleteArenaTeam: (id) => request('DELETE', `/api/arena/${id}`),

  getAlerts: (page = 1, { severity = '', type = '' } = {}) => {
    const params = new URLSearchParams({ page });
    if (severity) params.set('severity', severity);
    if (type)     params.set('type', type);
    return request('GET', `/api/alerts?${params}`);
  },
  deleteAlert:  (id) => request('DELETE', `/api/alerts/${id}`),
  deleteAlerts: (ids) => {
    if (!ids || !ids.length) return Promise.reject(new Error('No IDs provided'));
    const params = new URLSearchParams();
    ids.forEach((id) => params.append('ids', id));
    return request('DELETE', `/api/alerts?${params}`);
  },
  clearAlerts:  ({ severity = '', type = '', olderThan = 0 } = {}) => {
    const params = new URLSearchParams();
    if (olderThan > 0) params.set('olderThan', olderThan);
    if (severity) params.set('severity', severity);
    if (type)     params.set('type', type);
    const qs = params.toString();
    return request('DELETE', `/api/alerts${qs ? `?${qs}` : ''}`);
  },

  // pdump — fetch the configured default output directory from the server
  pdumpDefaultPath: () => request('GET', '/api/pdump/default-path'),

  // pdump — list .sql/.txt files in the configured server dump directory
  pdumpListFiles: () => request('GET', '/api/pdump/list-files'),

  // pdump load — import a dump (content string or server-side filePath)
  pdumpLoad: (body) => request('POST', '/api/pdump/load', body),

  // pdump — save to server path (returns JSON)
  pdumpSave: (guid, filePath) =>
    request('POST', `/api/pdump/${guid}`, { filePath }),

  // pdump — download to browser (returns a Blob + suggested filename)
  pdumpDownload: async (guid) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/pdump/${guid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      if (res.status === 401) window.dispatchEvent(new Event('auth-expired'));
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `dump_${guid}.sql`;
    return { blob, filename };
  },

  getNameFilters:    ()           => request('GET',    '/api/namefilters'),
  addNameFilter:     (type, name) => request('POST',   `/api/namefilters/${type}`, { name }),
  removeNameFilter:  (type, name) => request('DELETE', `/api/namefilters/${type}/${encodeURIComponent(name)}`),

  getChangelog: () => request('GET', '/api/changelog'),

  // Calendar
  getCalendarEvents:     (from, to) => request('GET', `/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  createCalendarEvent:   (data)     => request('POST',   '/api/calendar/events', data),
  updateCalendarEvent:   (id, data) => request('PUT',    `/api/calendar/events/${id}`, data),
  deleteCalendarEvent:   (id)       => request('DELETE', `/api/calendar/events/${id}`),
  getGameEvents:         ()         => request('GET',    '/api/calendar/game-events'),
  getIngameCalendarEvents: (from, to) => request('GET', `/api/calendar/ingame-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  getRaidResets:          ()         => request('GET',    '/api/calendar/raid-resets'),

  getBans: () => request('GET', '/api/bans'),
  banTarget: (type, target, duration, reason) =>
    request('POST', '/api/bans', { type, target, duration, reason }),
  unbanAccount:   (id)   => request('DELETE', `/api/bans/accounts/${id}`),
  unbanCharacter: (guid) => request('DELETE', `/api/bans/characters/${guid}`),
  unbanIp:        (ip)   => request('DELETE', `/api/bans/ips/${encodeURIComponent(ip)}`),

  // Backup Management
  getBackups:       ()         => request('GET', '/api/backups'),
  deleteBackup:     (filename) => request('DELETE', `/api/backups/${encodeURIComponent(filename)}`),
  downloadBackup: async (filename) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/backups/${encodeURIComponent(filename)}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      if (res.status === 401) window.dispatchEvent(new Event('auth-expired'));
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const blob = await res.blob();
    return { blob, filename };
  },

  // Health Check
  getHealthCheck: () => request('GET', '/api/healthcheck'),

  // Batch Operations
  batchBan:     (targets, duration, reason) => request('POST', '/api/batch/ban', { targets, duration, reason }),
  batchKick:    (names, reason)             => request('POST', '/api/batch/kick', { names, reason }),
  batchMail:    (data)                      => request('POST', '/api/batch/mail', data),
  batchGMLevel: (accountIds, gmlevel)       => request('POST', '/api/batch/gmlevel', { accountIds, gmlevel }),

  // Character Transfer
  transferCharacter: (characterGuid, targetAccountId) =>
    request('POST', '/api/character-transfer/transfer', { characterGuid, targetAccountId }),
  validateTransfer:  (guid) => request('GET', `/api/character-transfer/validate/${guid}`),
  searchTransferAccounts: (q) => request('GET', `/api/character-transfer/search-accounts?q=${encodeURIComponent(q)}`),

  // Notifications
  getNotifications:     ()           => request('GET', '/api/notifications'),
  getUnreadCount:       ()           => request('GET', '/api/notifications/unread-count'),
  markNotificationsRead:(lastSeenId) => request('POST', '/api/notifications/mark-read', { lastSeenId }),

  // Analytics
  getAnalytics:       (type, from, to, resolution) => {
    const params = new URLSearchParams({ type, from, to });
    if (resolution) params.set('resolution', resolution);
    return request('GET', `/api/analytics?${params}`);
  },
  getAnalyticsSummary: () => request('GET', '/api/analytics/summary'),

  // Sessions
  getSessions:     ()              => request('GET', '/api/sessions'),
  revokeSession:   (id)            => request('DELETE', `/api/sessions/${id}`),
  revokeAllSessions: (exceptTokenHash) => request('DELETE', '/api/sessions', { exceptTokenHash }),
};
