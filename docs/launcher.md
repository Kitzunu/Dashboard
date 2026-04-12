# Launcher App

The launcher is a desktop GUI (Electron) for starting and managing all Dashboard services without opening a terminal.

## Quick Start

```bash
npm run launcher
```

This requires the launcher dependencies to be installed. If you ran `npm run install:all`, they are already included.

To install them separately:

```bash
cd launcher && npm install
```

## Features

### Service Management

The sidebar shows three service cards:

| Service | Description |
| --- | --- |
| **Server Agent** | Manages worldserver/authserver processes (`backend/runAgent.js`) |
| **Backend API** | Express + Socket.IO API server (`backend/run.js`) |
| **Frontend** | Vite dev server for the React UI (`frontend/`) |

Each card has **Start**, **Stop**, and **Restart** buttons, plus a status badge showing `stopped`, `starting`, `running`, `stopping`, or `error`.

Use **Start All** / **Stop All** to control all services at once. Start All launches them in the correct order (agent first, then backend, then frontend).

### Game Server Management

Below the dashboard services, a **Game Servers** section shows the authserver and all configured worldservers. These are the actual game server processes managed by the Server Agent.

- Cards appear automatically once the Server Agent is running and connected
- Each card shows the server's current status (`running` / `stopped`), uptime, and PID
- **Start** / **Stop** buttons control game server processes via the Agent's HTTP API
- Click a game server card to view its console logs in the log panel
- Supports multi-realm setups — all worldservers from `worldservers.json` are listed

The launcher reads `AGENT_PORT` and `AGENT_SECRET` from your `.env` file to communicate with the Server Agent.

### Log Viewer

Click a service card to see its log output in real-time. Logs are color-coded:

- **White** — stdout
- **Red** — stderr
- **Blue italic** — system messages (start/stop events)

Each line includes a timestamp. Use the **Clear** button to reset logs and the **Auto-scroll** checkbox to follow new output.

### Settings

Click the gear icon in the title bar to configure:

- **Auto-start services on launch** — automatically starts all three services when the launcher opens
- **Minimize to system tray on close** — closing the window hides it to the tray instead of quitting (double-click the tray icon to restore)
- **Start minimized** — opens the launcher directly in the system tray

### System Tray

The launcher adds a tray icon with a right-click menu for quick access to Start All, Stop All, Open Dashboard, and Quit. Double-click the tray icon to show the window.

## Building a Portable Executable

To create a standalone `.exe` that doesn't require Node.js installed:

```bash
cd launcher
npm run build
```

The output will be in `launcher/dist/`.
