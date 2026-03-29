# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage online players, view live console output, handle GM tickets, manage bans, and query databases — all from your browser.

## Features

- **Overview** — Live dashboard with server status cards (PID, uptime), player/ticket/ban stats, system memory bar, and a real-time player-count sparkline graph
- **Console** — Real-time worldserver and authserver log output with full ANSI colour rendering, GM command input, persistent command history, and auto-scroll
- **Players** — Live online player list (auto-refreshes every 30 s) with player filter, kick, and multi-type ban (character / account / IP)
- **Tickets** — View, respond to, comment on, assign, escalate, and close in-game GM tickets; sidebar badge shows open ticket count
- **Bans** — Three-tab view of active account, character, and IP bans; issue new bans and unban with confirmation
- **Announcements** — Broadcast server-wide messages (chat announce or on-screen notify) with quick-fill templates and a sent-history log
- **Accounts** — Search accounts by username / email / IP, view details and characters, set GM level, lock/unlock accounts, reset passwords
- **Autobroadcast** — Manage the in-game autobroadcast rotation: add, edit, delete, and weight messages
- **Send Mail** — Send in-game mail, items, or money to any character directly from the dashboard
- **Mail Server** — Full CRUD editor for the `mail_server_template` system: create/edit/delete templates with subject, body, faction-specific money (Alliance/Horde gold/silver/copper), active toggle, item attachments per faction, eligibility conditions (Level, PlayTime, Quest, Achievement, Reputation, Faction, Race, Class, AccountFlags), and a recipients list showing which characters have already received each template (Administrators only)
- **Lag Reports** — Browse player-submitted lag reports from the `lag_reports` characters table; filterable by type and minimum latency; aggregate stats with top-reporter and top-map breakdowns; dismiss individual reports (GM 2+) or clear all (Administrator)
- **Bug Reports** — Browse and inspect in-game FeedbackUI bug reports, suggestions, and feedback; paginated table with character, zone, subject, and type; full detail modal with reporter info, location, system specs, aura list, and addon data; dismiss (delete) reports at GM level 2+
- **Servers** — Start, stop, scheduled restart, auto-restart, and MOTD editor for worldserver / authserver
- **IP Allowlist** — Backend access restricted to an allowlist of IPs (default: localhost only), configurable via `ALLOWED_IPS` in `.env`
- **DB Query** — Run preset SQL queries against the auth, world, and characters databases
- **Config** — View and edit `worldserver.conf` / `authserver.conf` in the browser with a find bar, unsaved-change indicators, and automatic `.bak` backups on save
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

# IP allowlist — comma-separated. Defaults to localhost only if omitted.
ALLOWED_IPS=127.0.0.1,::1
```

> **Important:** Generate a strong `JWT_SECRET`. You can use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to create one.

**4. Set up a dashboard account**

The dashboard authenticates against the AzerothCore `account` table using SRP6 — the same credentials you use to log into the game. Log in with any account that has a GM level assigned in `account_access`.

| GM Level | Role          | Access                                                                                          |
|----------|---------------|-------------------------------------------------------------------------------------------------|
| 1        | Moderator     | Overview, Console (read + send), Players list, GM Tickets                                       |
| 2        | Game Master   | + Kick/ban players, manage bans, issue announcements, accounts (view/lock), autobroadcast (view/add/edit), send in-game mail |
| 3        | Administrator | + Start/stop servers, scheduled restart, MOTD editor, DB Query, auto-restart, Config editor, create accounts, reset passwords, delete autobroadcasts |

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
- Shows all characters currently online with race, class, level, zone (resolved from AreaTable.dbc when `DBC_PATH` is configured, otherwise raw zone ID), and account name
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

### ⚙ Servers (Administrators only)
- Start and stop worldserver and authserver directly from the dashboard
- **Exit** — sends `server exit` for an immediate clean shutdown
- **Shutdown** — sends `server shutdown <delay>` with a configurable countdown (seconds)
- **Auto-restart** — toggle per-server; automatically restarts the process after a crash (does not restart on manual stop)
- **Scheduled Restart** — preset delays (1m – 1h) or custom seconds; sends `server restart <delay>` so the core handles in-game countdown announcements automatically; cancel button available
- **Message of the Day** — read and update the MOTD via `server set motd`; unsaved-changes indicator and discard option
- Live status indicators in the sidebar footer

### ✉ Send Mail (GM level 2+)
- **Mail** — send a plain in-game mail to any character using `send mail`
- **Items** — attach up to 12 items by entry ID and count using `send items`
- **Money** — send gold/silver/copper with separate denomination inputs (auto-converts to copper) using `send money`
- Player name and subject are preserved after send for quick follow-up messages

### 🗄 DB Query
- Run preset SQL queries against auth, world, or characters databases
- Results displayed in a scrollable table

### 📊 Overview
- Two server cards showing live status, PID, and per-second uptime timer for worldserver and authserver
- Three stat cards: Players Online, Open Tickets, Active Bans
- **System Memory bar** — used/total GB with percentage; turns amber then red when warning threshold is exceeded
- **CPU Usage bar** — sampled across all cores over 200 ms; turns amber then red when warning threshold is exceeded
- **Configurable alert thresholds** — ⚙ button in the page header to set CPU % and memory % warning levels; saved to `backend/thresholds.json` and persisted across restarts (save requires Administrator)
- **Browser alert notifications** — 🔔 button in the Overview header requests notification permission; when CPU or memory crosses its threshold a browser notification pops up with a distinct two-tone sound (ascending beep for CPU, descending for memory); alerts fire once on threshold crossing, not on every poll
- SVG sparkline graph of player count over the last hour (sampled every 30 s, up to 120 points)
- Core, DB version, and Cache ID read from the `version` table; **Core Revision** is a clickable link to the AzerothCore GitHub commit
- Current Message of the Day displayed at the bottom
- Auto-refreshes every 30 seconds

### 📢 Announcements (GM level 2+)
- Choose between **Announce** (chat log) and **Notify** (on-screen popup) message types
- 200-character limit with live counter
- Six quick-fill message templates (restart warnings, welcome message, events)
- Ctrl+Enter keyboard shortcut to send
- History table showing all announcements sent in this session

### 👤 Accounts (GM level 2+)
- Search accounts by username, email, or IP address (up to 50 results)
- Results table with GM level badge, online/locked status indicators
- **View** any account: full details grid (ID, email, join date, last login, last IP, GM level, expansion, status) plus character list with playtime
- **GM Level** — change role via dropdown; uses `account_access` table (Administrators only)
- **Expansion** — set allowed expansion via `.account set addon` (Administrators only)
- **Email** — edit account email directly (Administrators only)
- **Ban** — ban by account name or last known IP with duration presets (1h / 1d / 7d / 30d / permanent) and custom duration; uses `.ban account` / `.ban ip` (GM level 2+)
- **Lock / Unlock** — prevent or restore login access (GM level 2+)
- **Reset Password** — set a new password via `.account set password` (Administrators only)
- **Delete Account** — permanently delete account and characters via `.account delete`; requires typing the account name to confirm (Administrators only)
- **Mute / Unmute** — per-character chat silence via `.mute` / `.unmute` with duration presets and reason (Administrators only)
- **Create Account** — create new accounts directly from the dashboard (Administrators only)

### 📣 Autobroadcast (GM level 2+)
- Table of all autobroadcast entries with ID, message text, and colour-coded weight badge (green ≥ 50, amber 20–49, dim < 20)
- **Add** new entries with text and weight (1–100)
- **Edit** existing entries inline
- **Delete** with confirmation modal
- Weight controls how often a message is selected relative to others

### 📬 Mail Server (Administrators only)
- Full CRUD editor for the `mail_server_template` system (4 linked tables in the characters database)
- **Template list** — table showing ID, active/inactive status badge, subject, Alliance and Horde money amounts, item count, condition count, and recipient count
- **Create / Edit modal** with four tabs:
  - **General** — Subject, body textarea, Alliance money (gold/silver/copper inputs), Horde money, active toggle
  - **Items** — Per-faction item attachments; add by selecting Alliance or Horde, entering Item ID and count; remove individual items
  - **Conditions** — Eligibility conditions (type dropdown: Level / PlayTime / Quest / Achievement / Reputation / Faction / Race / Class / AccountFlags); each type shows contextual field labels (e.g. "Required level", "Quest ID", "Faction ID", "Minutes played"); value and state fields with hints
  - **Recipients** — Read-only list of characters who have already received the template (name, level, GUID)
- **Delete** with confirmation modal noting cascade deletion of items, conditions, and recipient records
- Viewing is available to GM 2+; create/edit/delete requires Administrator (GM 3)

### 📶 Lag Reports (GM level 1+)
- Paginated table (50 per page) of all player-submitted lag events from the `lag_reports` characters database table
- **Filter by type** — All / Loot / Auction House / Mail / Chat / Movement / Spells & Abilities
- **Filter by minimum latency** — Any / ≥100 ms / ≥250 ms / ≥500 ms / ≥1 s
- **Summary bar** — Total reports, average latency, peak latency, and individual counts for all six lag types; latency values turn amber/red when high
- **▼ Show Stats** toggle reveals:
  - Top 5 most-reporting characters with their average latency
  - Top 5 most-affected maps with report count and average latency
- Each row shows: ID, type badge (Loot / Auction House / Mail / Chat / Movement / Spells & Abilities), character name, map name (resolved from Map.dbc when `DBC_PATH` is configured, otherwise `Map {id}`), X/Y/Z coordinates, colour-coded latency badge, and timestamp
- **Dismiss** button per row (GM level 2+) removes a single report
- **Clear All** button (Administrator only) deletes all reports with a confirmation modal

### 🐛 Bug Reports (GM level 1+)
- Paginated table (25 per page) of all in-game FeedbackUI reports from the `bugreport` characters database table
- Filter by type: **All**, **Bugs**, **Suggestions**, **Feedback**
- Table shows: ID, type badge (Bug / Suggestion / Feedback), character name, zone, subject, and report date
- Click any row (or the **View** button) to open a full detail modal with sections:
  - **Description** — the player's free-text report
  - **Reporter** — character name, account, realm, and character description
  - **Location** — zone, map, coordinates, and position string
  - **Subject** — subject name, subject type, target name, and target GUID
  - **System** — OS, computer model, memory, CPU info, WoW version, build, and locale
  - **Addons** — related addon title/version, loaded addons list, and disabled addons list
  - **Active Auras** — full aura list at time of report
- **Dismiss** button (GM level 2+) removes the report from the database

### 📄 Config (Administrators only)
- View and edit `worldserver.conf` and `authserver.conf` directly in the browser
- Full monospace editor with line numbers
- **Find** bar — search for any setting by name and jump to it instantly
- Unsaved-changes indicator (amber dot on tab, badge in header and footer)
- **Save** writes the file and automatically creates a `.bak` backup of the previous version
- **Discard** reverts all edits back to the last saved state

## DBC File Integration (Optional)

The dashboard can resolve map and zone IDs to human-readable names by reading WotLK 3.3.5a client DBC files. Set `DBC_PATH` in your `.env` to the `DBFilesClient` folder inside your WoW client data directory:

```env
# Windows example
DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient

# Linux example
DBC_PATH=/opt/wow/Data/enUS/DBFilesClient
```

When configured, the backend reads `Map.dbc` and `AreaTable.dbc` at startup and serves the lookup tables to the frontend. If `DBC_PATH` is not set or the files are missing the dashboard gracefully falls back to `Map {id}` / `Area {id}` placeholders — everything still works, just without pretty names.

Files read:

| File | Data |
|------|------|
| `Map.dbc` | Map names shown in Lag Reports (e.g. *Azeroth*, *Outland*, *Warsong Gulch*) |
| `AreaTable.dbc` | Zone/area names shown in Bug Reports |

## Project Structure

```
azerothcore-dashboard/
├── backend/
│   ├── middleware/
│   │   ├── auth.js               # JWT verification, GM level guards
│   │   └── ipAllowlist.js        # IP allowlist enforcement (ALLOWED_IPS env var)
│   ├── routes/
│   │   ├── auth.js               # Login (SRP6 verification + rate limiting)
│   │   ├── accounts.js           # Account search, GM level, lock, password, create
│   │   ├── announcements.js      # Send announce/notify, in-memory history
│   │   ├── autobroadcast.js      # CRUD for autobroadcast table
│   │   ├── bans.js               # Account / character / IP ban management
│   │   ├── config.js             # Read and save worldserver/authserver config files
│   │   ├── console.js            # GM command execution
│   │   ├── db.js                 # Preset database query endpoint
│   │   ├── mail.js               # Send in-game mail / items / money via GM commands
│   │   ├── overview.js           # Dashboard summary: servers, players, tickets, bans, memory
│   │   ├── players.js            # Online players, kick, multi-type ban, count
│   │   ├── servers.js            # Start, stop, status, logs, auto-restart
│   │   ├── servertools.js        # Scheduled restart, cancel restart, MOTD get/set
│   │   ├── tickets.js            # GM ticket CRUD (respond, comment, assign, escalate)
│   │   ├── bugreports.js         # Bug report list, detail, and dismiss endpoints
│   │   ├── lagreports.js         # Lag report list, stats, dismiss, and clear-all endpoints
│   │   ├── mailserver.js         # Mail server template CRUD + items, conditions, recipients
│   │   └── dbc.js                # DBC lookup endpoints (maps, areas, status)
│   ├── db.js                     # MySQL connection pools (auth, world, characters)
│   ├── dbc.js                    # WotLK DBC binary parser; resolves map/area IDs to names
│   ├── playerHistory.js          # Rolling in-memory player count history (max 120 points)
│   ├── processManager.js         # Server process lifecycle + Socket.IO broadcast
│   └── server.js                 # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AccountsPage.jsx   # Account search, detail modal, GM/lock/password management
│       │   ├── AnnouncePage.jsx   # Broadcast announce/notify with templates and history
│       │   ├── AutobroadcastPage.jsx  # Manage autobroadcast entries (add/edit/delete/weight)
│       │   ├── BansPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── BugReportsPage.jsx # FeedbackUI bug report browser with detail modal
│       │   ├── LagReportsPage.jsx # Lag report browser with stats, filters, and latency colouring
│       │   ├── MailServerPage.jsx # Mail server template editor (general, items, conditions, recipients)
│       │   ├── HomePage.jsx       # Overview: server cards, stat cards, memory/CPU bars, sparkline
│       │   ├── MailPage.jsx       # Send in-game mail / items / money to characters
│       │   ├── Layout.jsx         # Sidebar, nav badges, toast container
│       │   ├── Login.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ServersPage.jsx
│       │   └── TicketsPage.jsx
│       ├── ansi.js               # ANSI SGR colour parser for console output
│       ├── api.js                # Fetch wrapper with JWT auth + 401 handling
│       ├── App.jsx               # Auth context and page routing
│       ├── socket.js             # Socket.IO client
│       └── toast.js              # Global toast notification helper
├── .env.example
└── package.json                  # Root scripts (start, install:all)
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
