# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage online players, view live console output, handle GM tickets, manage bans, and query databases — all from your browser.

## Features

- **Console** — Real-time worldserver and authserver log output with full ANSI colour rendering, GM command input, persistent command history, and auto-scroll
- **Players** — Live online player list (auto-refreshes every 30 s) with player filter, kick, and multi-type ban (character / account / IP)
- **Tickets** — View, respond to, comment on, assign, escalate, and close in-game GM tickets; sidebar badge shows open ticket count
- **Bans** — Three-tab view of active account, character, and IP bans; issue new bans and unban with confirmation
- **Servers** — Start, stop (immediate exit or graceful shutdown with delay), and auto-restart worldserver / authserver
- **DB Query** — Run preset SQL queries against the auth, world, and characters databases
- **Role-based access** — GM level controls what each user can see and do
- **Toast notifications** — Non-blocking feedback for every action
- **Session management** — JWT-based auth with automatic logout on token expiry

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A running AzerothCore MySQL instance (`acore_auth`, `acore_world`, `acore_characters`)
- A database user with read/write access to those three databases

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-username/azerothcore-dashboard.git
cd azerothcore-dashboard
```

**2. Install all dependencies**

```bash
npm run install:all
```

This installs the root, backend, and frontend packages in one step.

**3. Configure environment**

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Open `.env` and set the following values:

```env
# Paths to your AzerothCore executables
WORLDSERVER_PATH=C:\AzerothCore\worldserver.exe
AUTHSERVER_PATH=C:\AzerothCore\authserver.exe

# Config file paths (optional — defaults to the .conf next to each executable)
# WORLDSERVER_CONF=C:\AzerothCore\worldserver.conf
# AUTHSERVER_CONF=C:\AzerothCore\authserver.conf

# Database connection
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=acore
DB_PASSWORD=acore
AUTH_DB=acore_auth
WORLD_DB=acore_world
CHARACTERS_DB=acore_characters

# JWT secret — must be changed to a long random string
JWT_SECRET=change-this-to-a-random-secret

# Backend port and frontend URL (for CORS)
PORT=3001
FRONTEND_URL=http://localhost:5173
```

> **Important:** Generate a strong `JWT_SECRET`. You can use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to create one.

**4. Set up a dashboard account**

The dashboard authenticates against the AzerothCore `account` table using SRP6 — the same credentials you use to log into the game. Log in with any account that has a GM level assigned in `account_access`.

| GM Level | Role          | Access                                                              |
|----------|---------------|---------------------------------------------------------------------|
| 1        | Moderator     | Console (read + send), Players list, GM Tickets                     |
| 2        | Game Master   | + Kick/ban players, manage bans, issue bans, view all tickets       |
| 3        | Administrator | + Start/stop servers, DB Query, auto-restart toggle                 |

To grant a GM level, run this in your auth database:

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```

## Running

Start both the backend and frontend together:

```bash
npm start
```

Or run them separately:

```bash
# Backend only (port 3001 by default)
npm run start:backend

# Frontend only (port 5173 by default)
npm run start:frontend
```

Then open [http://localhost:5173](http://localhost:5173) in your browser and log in with your AzerothCore account credentials.

## Pages

### 🖥 Console
- Live log streaming via Socket.IO for both worldserver and authserver
- Full ANSI SGR colour support — log colours defined in `worldserver.conf` render correctly
- Send GM commands directly from the browser
- Command history persisted per session (up and down arrow navigation)
- Auto-scroll toggle, persisted across sessions

### 👥 Players
- Shows all characters currently online with race, class, level, zone, and account name
- Filter by character name or account username
- **Kick** — remove a player with an optional reason
- **Ban** — choose ban type (Character / Account / IP), target is pre-filled from the player row; enter duration and reason
- Auto-refreshes every 30 seconds; clears and stops when the worldserver is offline
- Player count badge in the sidebar reflects real-time online count (shows 0 when server is offline)

### 🎫 Tickets
- Lists all open GM tickets (`type = 0` in `gm_ticket`) with player name, message preview, creation time, assigned GM, and status badges (New / Escalated)
- Click any row to expand full details including GM comment and last response
- **Respond & Close** — send a response and optionally close the ticket in one action
- **Add Comment** — attach an internal GM comment via `.ticket comment`
- **Assign / Unassign** — assign the ticket to a GM by character name
- **Escalate / De-escalate** — flag a ticket as escalated or remove the flag
- Toggle between open-only and all tickets
- Open ticket count badge in the sidebar, polled every 60 seconds
- Auto-refreshes every 60 seconds; closed tickets are removed from the open list immediately on action

### 🔨 Bans
- Three tabs: **Account Bans**, **Character Bans**, **IP Bans**
- Each tab shows who was banned, by whom, the reason, ban date, and expiry (or "Permanent")
- **Issue Ban** button — choose type, enter target, duration (e.g. `1h`, `7d`, `-1` for permanent), and reason
- **Unban** button on each row with a confirmation modal showing the ban reason

### ⚙ Servers
- Start and stop worldserver and authserver directly from the dashboard
- **Exit** — sends `server exit` for an immediate clean shutdown
- **Shutdown** — sends `server shutdown <delay>` with a configurable countdown (seconds)
- **Auto-restart** — toggle per-server; automatically restarts the process after a crash (does not restart on manual stop)
- Live status indicators in the sidebar footer

### 🗄 DB Query
- Run preset SQL queries against auth, world, or characters databases
- Results displayed in a scrollable table

### 📄 Config (Administrators only)
- View and edit `worldserver.conf` and `authserver.conf` directly in the browser
- Full monospace editor with line numbers
- **Find** bar — search for any setting by name and jump to it instantly
- Unsaved-changes indicator (amber dot on tab, badge in header and footer)
- **Save** writes the file and automatically creates a `.bak` backup of the previous version
- **Discard** reverts all edits back to the last saved state

## Project Structure

```
azerothcore-dashboard/
├── backend/
│   ├── middleware/
│   │   └── auth.js           # JWT verification, GM level guards
│   ├── routes/
│   │   ├── auth.js           # Login (SRP6 verification + rate limiting)
│   │   ├── bans.js           # Account / character / IP ban management
│   │   ├── console.js        # GM command execution
│   │   ├── db.js             # Preset database query endpoint
│   │   ├── players.js        # Online players, kick, multi-type ban, count
│   │   ├── servers.js        # Start, stop, status, logs, auto-restart
│   │   ├── config.js         # Read and save worldserver/authserver config files
│   │   └── tickets.js        # GM ticket CRUD (respond, comment, assign, escalate)
│   ├── db.js                 # MySQL connection pools (auth, world, characters)
│   ├── processManager.js     # Server process lifecycle + Socket.IO broadcast
│   └── server.js             # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── BansPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── Layout.jsx        # Sidebar, nav badges, toast container
│       │   ├── Login.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ServersPage.jsx
│       │   └── TicketsPage.jsx
│       ├── ansi.js           # ANSI SGR colour parser for console output
│       ├── api.js            # Fetch wrapper with JWT auth + 401 handling
│       ├── App.jsx           # Auth context and page routing
│       ├── socket.js         # Socket.IO client
│       └── toast.js          # Global toast notification helper
├── .env.example
└── package.json              # Root scripts (start, install:all)
```

## Notes

- The dashboard starts `worldserver.exe` and `authserver.exe` as **child processes**. If the dashboard backend process exits, the game servers will also stop.
- **Graceful shutdown:** worldserver uses `server exit` (immediate) or `server shutdown <N>` (countdown). Authserver is terminated with `SIGTERM`.
- **Auto-restart** tracks intentional stops so it only restarts on unexpected crashes, not manual stops.
- **Authentication** uses AzerothCore's SRP6 verifier (salt + verifier columns) — no plain-text password storage or comparison.
- **Login rate limiting** is set to 10 attempts per 15 minutes per IP to protect against brute-force attacks.
- The session token expires after 8 hours and will automatically redirect to the login page.
- Console command history persists for the current browser session. Auto-scroll preference is saved across sessions in `localStorage`.

## Credits

- **[AzerothCore](https://www.azerothcore.org/)** — the open-source World of Warcraft emulator this dashboard is built for
- **Development** — assisted by [Claude Code](https://claude.ai/code) (Anthropic)
