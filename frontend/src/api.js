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

/** Append realmId query param if provided */
function rp(path, realmId) {
  if (!realmId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}realmId=${encodeURIComponent(realmId)}`;
}

export const api = {
  logout: (reason = 'manual') => request('POST', '/api/auth/logout', { reason }),
  login: (username, password) =>
    request('POST', '/api/auth/login', { username, password }),

  getServerStatus: () => request('GET', '/api/servers/status'),
  getServerList:   () => request('GET', '/api/servers/list'),
  startServer: (name) => request('POST', `/api/servers/${name}/start`),
  stopServer: (name, mode, delay) => request('POST', `/api/servers/${name}/stop`, { mode, delay }),
  setAutoRestart: (name, enabled) => request('POST', `/api/servers/${name}/autorestart`, { enabled }),
  getServerLogs: (name) => request('GET', `/api/servers/${name}/logs`),

  sendCommand: (command, server) => request('POST', '/api/console/command', { command, server }),

  getPlayers: (realmId) => request('GET', rp('/api/players', realmId)),
  kickPlayer: (name, reason) => request('POST', `/api/players/${encodeURIComponent(name)}/kick`, { reason }),
  banPlayer: (name, duration, reason, type = 'character', target) =>
    request('POST', `/api/players/${encodeURIComponent(name)}/ban`, { type, target: target || name, duration, reason }),

  dbQuery: (query, database, realmId) => request('POST', rp('/api/db/query', realmId), { query, database }),

  getPlayerCount: (realmId) => request('GET', rp('/api/players/count', realmId)),

  getTickets:      (realmId)      => request('GET',  rp('/api/tickets', realmId)),
  getAllTickets:    (realmId)      => request('GET',  rp('/api/tickets/all', realmId)),
  getTicketCount:  (realmId)      => request('GET',  rp('/api/tickets/count', realmId)),
  closeTicket:     (id, realmId)          => request('POST', rp(`/api/tickets/${id}/close`, realmId)),
  respondTicket:   (id, response, realmId) => request('POST', rp(`/api/tickets/${id}/respond`, realmId), { response }),
  commentTicket:   (id, comment, realmId)  => request('POST', rp(`/api/tickets/${id}/comment`, realmId), { comment }),
  assignTicket:    (id, gm, realmId)       => request('POST', rp(`/api/tickets/${id}/assign`, realmId),  { gm }),
  unassignTicket:  (id, realmId)      => request('POST', rp(`/api/tickets/${id}/unassign`, realmId)),
  escalateTicket:  (id, realmId)      => request('POST', rp(`/api/tickets/${id}/escalate`, realmId)),
  deescalateTicket:(id, realmId)      => request('POST', rp(`/api/tickets/${id}/deescalate`, realmId)),

  getOverview: (realmId) => request('GET', rp('/api/overview', realmId)),

  getThresholds: ()      => request('GET', '/api/thresholds'),
  saveThresholds: (data) => request('PUT', '/api/thresholds', data),

  getAnnouncements:  ()                         => request('GET',  '/api/announcements/history'),
  sendAnnouncement:  (type, message, server)   => request('POST', '/api/announcements', { type, message, server }),

  getAutobroadcasts:    ()           => request('GET',    '/api/autobroadcast'),
  createAutobroadcast:  (text, weight) => request('POST', '/api/autobroadcast', { text, weight }),
  updateAutobroadcast:  (id, text, weight) => request('PUT', `/api/autobroadcast/${id}`, { text, weight }),
  deleteAutobroadcast:  (id)         => request('DELETE', `/api/autobroadcast/${id}`),

  searchAccounts:    (q, page = 1) => request('GET', `/api/accounts?q=${encodeURIComponent(q)}&page=${page}`),
  getAccount:        (id, realmId) => request('GET', rp(`/api/accounts/${id}`, realmId)),
  createAccount:     (username, password) => request('POST', '/api/accounts', { username, password }),
  setGMLevel:        (id, gmlevel)    => request('PATCH',   `/api/accounts/${id}/gmlevel`,   { gmlevel }),
  setAccountLock:    (id, locked)     => request('PATCH',   `/api/accounts/${id}/lock`,      { locked }),
  setExpansion:      (id, expansion)  => request('PATCH',   `/api/accounts/${id}/expansion`, { expansion }),
  setEmail:          (id, email)      => request('PATCH',   `/api/accounts/${id}/email`,     { email }),
  setAccountFlags:   (id, flags)      => request('PATCH',   `/api/accounts/${id}/flags`,     { flags }),
  resetPassword:     (id, password)   => request('POST',    `/api/accounts/${id}/password`,  { password }),
  deleteAccount:     (id)             => request('DELETE',  `/api/accounts/${id}`),
  muteCharacter:     (name, minutes, reason, server) => request('POST', '/api/accounts/mute',   { name, minutes, reason, server }),
  unmuteCharacter:   (name, server)           => request('POST',    '/api/accounts/unmute',     { name, server }),

  getMOTD:         ()                     => request('GET',  '/api/servertools/motd'),
  setMOTD:         (motd, server)        => request('PUT',  '/api/servertools/motd', { motd, server }),
  restartServer:   (delay, server)       => request('POST', '/api/servertools/restart', { delay, server }),
  cancelRestart:   (server)              => request('POST', '/api/servertools/restart/cancel', { server }),

  sendMail:        (player, subject, body, server)          => request('POST', '/api/mail', { type: 'text', player, subject, body, server }),
  sendMailItems:   (player, subject, body, items, server)   => request('POST', '/api/mail', { type: 'items', player, subject, body, items, server }),
  sendMailMoney:   (player, subject, body, money, server)   => request('POST', '/api/mail', { type: 'money', player, subject, body, money, server }),

  getConfigs:      ()             => request('GET', '/api/config'),
  getConfig:       (name)         => request('GET', `/api/config/${name}`),
  saveConfig:      (name, content) => request('PUT', `/api/config/${name}`, { content }),

  // DBC data
  getDBCStatus:   () => request('GET', '/api/dbc/status'),
  getDBCMaps:     () => request('GET', '/api/dbc/maps'),
  getDBCAreas:    () => request('GET', '/api/dbc/areas'),
  getDBCRaces:    () => request('GET', '/api/dbc/races'),
  getDBCClasses:  () => request('GET', '/api/dbc/classes'),
  getDBCBattlegrounds: () => request('GET', '/api/dbc/battlegrounds'),
  getDBCAuctionHouses: () => request('GET', '/api/dbc/auctionhouses'),

  // Mail Server Templates
  getMailServerTemplates:  (realmId)          => request('GET',    rp('/api/mailserver', realmId)),
  getMailServerTemplate:   (id, realmId)      => request('GET',    rp(`/api/mailserver/${id}`, realmId)),
  createMailServerTemplate:(data, realmId)    => request('POST',   rp('/api/mailserver', realmId), data),
  updateMailServerTemplate:(id, data, realmId)=> request('PUT',    rp(`/api/mailserver/${id}`, realmId), data),
  deleteMailServerTemplate:(id, realmId)      => request('DELETE', rp(`/api/mailserver/${id}`, realmId)),
  addMailServerItem:       (id, data, realmId)=> request('POST',   rp(`/api/mailserver/${id}/items`, realmId), data),
  deleteMailServerItem:    (id, itemId, realmId)=> request('DELETE', rp(`/api/mailserver/${id}/items/${itemId}`, realmId)),
  addMailServerCondition:  (id, data, realmId)=> request('POST',   rp(`/api/mailserver/${id}/conditions`, realmId), data),
  deleteMailServerCondition:(id, condId, realmId)=>request('DELETE', rp(`/api/mailserver/${id}/conditions/${condId}`, realmId)),
  getMailServerRecipients: (id, realmId)      => request('GET',    rp(`/api/mailserver/${id}/recipients`, realmId)),

  getLagReports: (page, lagType, minLatency, realmId) => {
    const params = new URLSearchParams({ page: page || 1 });
    if (lagType != null && lagType !== 'all') params.set('lagType', lagType);
    if (minLatency > 0) params.set('minLatency', minLatency);
    return request('GET', rp(`/api/lagreports?${params}`, realmId));
  },
  getLagStats:      (realmId)   => request('GET', rp('/api/lagreports/stats', realmId)),
  deleteLagReport:  (id, realmId) => request('DELETE', rp(`/api/lagreports/${id}`, realmId)),
  clearLagReports:  (realmId)   => request('DELETE', rp('/api/lagreports', realmId)),

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

  getSpamReports: (page = 1, type = 'all', search = '', realmId) =>
    request('GET', rp(`/api/spamreports?page=${page}&type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`, realmId)),
  deleteSpamReport: (id, realmId) => request('DELETE', rp(`/api/spamreports/${id}`, realmId)),
  clearSpamReports: (realmId) => request('DELETE', rp('/api/spamreports', realmId)),

  getChannels:       (realmId) => request('GET', rp('/api/channels', realmId)),
  getChannel:        (id, realmId) => request('GET', rp(`/api/channels/${id}`, realmId)),
  unbanChannelPlayer:(channelId, guid, realmId) => request('DELETE', rp(`/api/channels/${channelId}/bans/${guid}`, realmId)),
  deleteChannel:     (id, realmId) => request('DELETE', rp(`/api/channels/${id}`, realmId)),

  getBugReports:  (page, feedbackType, state, search, realmId) => {
    const params = new URLSearchParams({ page: page || 1 });
    if (feedbackType != null && feedbackType !== 'all') params.set('feedbackType', feedbackType);
    if (state  != null && state  !== 'all') params.set('state',  state);
    if (search != null && search !== '')    params.set('search', search);
    return request('GET', rp(`/api/bugreports?${params}`, realmId));
  },
  getBugReport:      (id, realmId)   => request('GET', rp(`/api/bugreports/${id}`, realmId)),
  updateBugReport:   (id, updates, realmId) => request('PATCH', rp(`/api/bugreports/${id}`, realmId), updates),

  getMutes:   ()   => request('GET',    '/api/mutes'),
  unmute:     (id) => request('DELETE', `/api/mutes/${id}`),

  getScheduledTasks:    ()        => request('GET',    '/api/scheduled-tasks'),
  createScheduledTask:  (data)    => request('POST',   '/api/scheduled-tasks', data),
  updateScheduledTask:  (id, data)=> request('PUT',    `/api/scheduled-tasks/${id}`, data),
  deleteScheduledTask:  (id)      => request('DELETE', `/api/scheduled-tasks/${id}`),
  runScheduledTask:     (id)      => request('POST',   `/api/scheduled-tasks/${id}/run`),

  searchCharacters: (q, realmId)    => request('GET', rp(`/api/characters/search?q=${encodeURIComponent(q)}`, realmId)),
  getCharacter:     (guid, realmId) => request('GET', rp(`/api/characters/${guid}`, realmId)),

  getGuilds:     (realmId)   => request('GET', rp('/api/guilds', realmId)),
  getGuild:      (id, realmId) => request('GET', rp(`/api/guilds/${id}`, realmId)),
  getGuildBank:  (id, realmId) => request('GET', rp(`/api/guilds/${id}/bank`, realmId)),

  getArenaTeams: (realmId)   => request('GET', rp('/api/arena', realmId)),
  getArenaTeam:  (id, realmId) => request('GET', rp(`/api/arena/${id}`, realmId)),
  getArenaMatches: (id, realmId) => request('GET', rp(`/api/arena/${id}/matches`, realmId)),
  createArenaTeam: (data, realmId) => request('POST', rp('/api/arena', realmId), data),
  updateArenaTeam: (id, data, realmId) => request('PATCH', rp(`/api/arena/${id}`, realmId), data),
  removeArenaMember: (id, guid, realmId) => request('DELETE', rp(`/api/arena/${id}/members/${guid}`, realmId)),
  deleteArenaTeam: (id, realmId) => request('DELETE', rp(`/api/arena/${id}`, realmId)),

  getBattlegroundHistory: ({ limit = 50, offset = 0, type, bracket, realmId } = {}) => {
    const params = new URLSearchParams();
    if (limit)     params.set('limit',   limit);
    if (offset)    params.set('offset',  offset);
    if (type != null)    params.set('type',    type);
    if (bracket != null) params.set('bracket', bracket);
    return request('GET', rp(`/api/battleground/history?${params}`, realmId));
  },
  getBattlegroundMatch:     (id, realmId) => request('GET', rp(`/api/battleground/history/${id}`, realmId)),
  getBattlegroundDeserters: ({ limit = 50, offset = 0, realmId } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    return request('GET', rp(`/api/battleground/deserters?${params}`, realmId));
  },
  removeBattlegroundDeserter: (guid, realmId) => request('DELETE', rp(`/api/battleground/deserters/${guid}`, realmId)),
  getBattlegroundStats: (realmId) => request('GET', rp('/api/battleground/stats', realmId)),

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
  pdumpLoad: (body, realmId) => request('POST', rp('/api/pdump/load', realmId), body),

  // pdump — save to server path (returns JSON)
  pdumpSave: (guid, filePath, realmId) =>
    request('POST', rp(`/api/pdump/${guid}`, realmId), { filePath }),

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

  getNameFilters:    (realmId)           => request('GET',    rp('/api/namefilters', realmId)),
  addNameFilter:     (type, name, realmId) => request('POST',   rp(`/api/namefilters/${type}`, realmId), { name }),
  removeNameFilter:  (type, name, realmId) => request('DELETE', rp(`/api/namefilters/${type}/${encodeURIComponent(name)}`, realmId)),

  getChangelog: () => request('GET', '/api/changelog'),

  // Calendar
  getCalendarEvents:     (from, to) => request('GET', `/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  createCalendarEvent:   (data)     => request('POST',   '/api/calendar/events', data),
  updateCalendarEvent:   (id, data) => request('PUT',    `/api/calendar/events/${id}`, data),
  deleteCalendarEvent:   (id)       => request('DELETE', `/api/calendar/events/${id}`),
  getGameEvents:         (realmId)         => request('GET', rp('/api/calendar/game-events', realmId)),
  getIngameCalendarEvents: (from, to, realmId) => request('GET', rp(`/api/calendar/ingame-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, realmId)),
  getRaidResets:          ()         => request('GET',    '/api/calendar/raid-resets'),

  getBans: (realmId) => request('GET', rp('/api/bans', realmId)),
  banTarget: (type, target, duration, reason) =>
    request('POST', '/api/bans', { type, target, duration, reason }),
  unbanAccount:   (id)   => request('DELETE', `/api/bans/accounts/${id}`),
  unbanCharacter: (guid, realmId) => request('DELETE', rp(`/api/bans/characters/${guid}`, realmId)),
  unbanIp:        (ip)   => request('DELETE', `/api/bans/ips/${encodeURIComponent(ip)}`),

  // Backup Management
  getBackups:       ()         => request('GET', '/api/backups'),
  createBackup:     (databases) => request('POST', '/api/backups/create', { databases }),
  restoreBackup:    (filename) => request('POST', '/api/backups/restore', { filename }),
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
  getHealthCheckAll: () => request('GET', '/api/healthcheck/all'),

  // Batch Operations
  batchBan:     (targets, duration, reason, server) => request('POST', '/api/batch/ban', { targets, duration, reason, server }),
  batchKick:    (names, reason, server)             => request('POST', '/api/batch/kick', { names, reason, server }),
  batchMail:    (data)                      => request('POST', '/api/batch/mail', data),
  batchGMLevel: (accountIds, gmlevel)       => request('POST', '/api/batch/gmlevel', { accountIds, gmlevel }),

  // Character Transfer
  transferCharacter: (characterGuid, targetAccountId, realmId) =>
    request('POST', rp('/api/character-transfer/transfer', realmId), { characterGuid, targetAccountId }),
  transferCharacterCrossRealm: (characterGuid, targetAccountId, sourceRealmId, destRealmId) =>
    request('POST', '/api/character-transfer/transfer-cross-realm', { characterGuid, targetAccountId, sourceRealmId, destRealmId }),
  validateTransfer:  (guid, realmId) => request('GET', rp(`/api/character-transfer/validate/${guid}`, realmId)),
  searchTransferAccounts: (q) => request('GET', `/api/character-transfer/search-accounts?q=${encodeURIComponent(q)}`),

  // Notifications
  getNotifications:     ()           => request('GET', '/api/notifications'),
  getUnreadCount:       ()           => request('GET', '/api/notifications/unread-count'),
  markNotificationsRead:(lastSeenId) => request('POST', '/api/notifications/mark-read', { lastSeenId }),

  // Analytics
  getAnalytics:       (type, from, to, resolution, realmId) => {
    const params = new URLSearchParams({ type, from, to });
    if (resolution) params.set('resolution', resolution);
    if (realmId) params.set('realmId', realmId);
    return request('GET', `/api/analytics?${params}`);
  },
  getAnalyticsSummary: () => request('GET', '/api/analytics/summary'),

  // Sessions
  getSessions:     ()              => request('GET', '/api/sessions'),
  revokeSession:   (id)            => request('DELETE', `/api/sessions/${id}`),
  revokeAllSessions: (exceptTokenHash) => request('DELETE', '/api/sessions', { exceptTokenHash }),

  // Auction House
  getAuctionListings: ({ page = 1, limit = 50, search = '', faction = '', sort = 'time', order = 'asc', realmId } = {}) => {
    const params = new URLSearchParams({ page, limit, sort, order });
    if (search) params.set('search', search);
    if (faction) params.set('faction', faction);
    return request('GET', rp(`/api/auctionhouse?${params}`, realmId));
  },
  getAuctionStats:    (realmId)   => request('GET', rp('/api/auctionhouse/stats', realmId)),
  removeAuction:      (id, realmId) => request('DELETE', rp(`/api/auctionhouse/${id}`, realmId)),

  // Realm info (for backups)
  getRealms: () => request('GET', '/api/servers/realms'),
};
