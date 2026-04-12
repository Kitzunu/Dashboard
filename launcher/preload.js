const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Services
  listServices:  () => ipcRenderer.invoke('services:list'),
  startService:  (id) => ipcRenderer.send('service:start', id),
  stopService:   (id) => ipcRenderer.send('service:stop', id),
  restartService:(id) => ipcRenderer.send('service:restart', id),
  startAll:      () => ipcRenderer.send('services:startAll'),
  stopAll:       () => ipcRenderer.send('services:stopAll'),
  clearLogs:     (id) => ipcRenderer.send('service:clearLogs', id),

  // Events
  onStatus: (cb) => {
    const listener = (_, id, status) => cb(id, status);
    ipcRenderer.on('service:status', listener);
    return () => ipcRenderer.removeListener('service:status', listener);
  },
  onLog: (cb) => {
    const listener = (_, id, entry) => cb(id, entry);
    ipcRenderer.on('service:log', listener);
    return () => ipcRenderer.removeListener('service:log', listener);
  },

  // Game servers (via Server Agent API)
  getGameServerStatus: () => ipcRenderer.invoke('gameServers:getStatus'),
  startGameServer:     (name) => ipcRenderer.invoke('gameServers:start', name),
  stopGameServer:      (name, mode) => ipcRenderer.invoke('gameServers:stop', name, mode),
  getGameServerLogs:   (name) => ipcRenderer.invoke('gameServers:getLogs', name),
  sendGameCommand:     (cmd, server) => ipcRenderer.invoke('gameServers:command', cmd, server),
  setAutoRestart:      (name, enabled) => ipcRenderer.invoke('gameServers:autoRestart', name, enabled),
  onGameServerStatus: (cb) => {
    const listener = (_, status) => cb(status);
    ipcRenderer.on('gameServers:status', listener);
    return () => ipcRenderer.removeListener('gameServers:status', listener);
  },
  onGameServerConsole: (cb) => {
    const listener = (_, server, line) => cb(server, line);
    ipcRenderer.on('gameServers:consoleLine', listener);
    return () => ipcRenderer.removeListener('gameServers:consoleLine', listener);
  },

  // Actions
  openDashboard: () => ipcRenderer.send('open:dashboard'),
  openRoot:      () => ipcRenderer.send('open:root'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.send('settings:set', s),
});
