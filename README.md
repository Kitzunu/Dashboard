# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage players, stream live console output, handle GM tickets, edit config files, and more — all from your browser.

## Features

**Server**
- **Overview** — Server status cards with live uptime timers, online player/ticket/ban counts, system memory and CPU bars with configurable alert thresholds, browser notifications with audio cues, worldserver TCP latency stats (mean/median/P95/P99/max over a rolling 60-minute window), and a player count sparkline
- **Console** — Real-time worldserver and authserver log streaming via Socket.IO with full ANSI colour rendering, GM command input, persistent per-session command history, and auto-scroll toggle
- **Servers** — Start, stop, scheduled restart, auto-restart toggle, and MOTD editor for worldserver and authserver
- **Autobroadcast** — Manage the in-game autobroadcast rotation: add, edit, delete, and weight messages
- **Mail Server** — Full CRUD editor for the `mail_server_template` system with subject, body, per-faction money and items, eligibility conditions, and a recipients list
- **DB Query** — Run SQL queries against the auth, world, or characters databases
- **Config** — Edit worldserver.conf, authserver.conf, and any module `.conf` files directly in the browser with line numbers, a find bar, unsaved-change indicators, and automatic `.bak` backups

**Game**
- **Players** — Live online player list with race, class, level, zone, and account; filter by name or account; kick with optional reason; ban by character, account, or IP
- **Tickets** — View, respond to, comment on, assign, escalate, and close GM tickets; sidebar badge shows open ticket count
- **Bans** — Three-tab view of active account, character, and IP bans; issue new bans and unban with confirmation
- **Announce** — Broadcast server-wide messages (chat announce or on-screen notify) with quick-fill templates and session history
- **Accounts** — Search by username, email, or IP; view full account detail and characters; set GM level, expansion, email, lock/unlock, reset password, mute/unmute characters, create accounts, and delete accounts
- **Send Mail** — Send in-game mail, items (up to 12), or money (gold/silver/copper) to any character
- **Spam Reports** — View player-submitted spam reports (mail / chat / calendar); filter by type; search by spammer name or description; delete individual reports (GM 2+); clear all (Administrator)
- **Channels** — Browse all active chat channels; view banned players and channel config (rights, speak delay, messages); lock icon for password-protected channels; unban players (GM 2+); delete channel (Administrator)

**Reports**
- **Lag Reports** — Browse player-submitted lag events; filter by type and minimum latency; aggregate stats with top reporters and top maps; dismiss or clear all
- **Bug Reports** — Browse FeedbackUI bug reports, suggestions, and feedback; separated into Open/Closed tabs with type filter; assignee and comment fields; close/reopen per report

**Dashboard** *(Administrator only)*
- **Audit Log** — Immutable record of all critical actions taken through the dashboard: logins (including failed attempts with reason), logouts, server start/stop/restart, config saves (with changed key→value diff), MOTD changes, bans/unbans, account changes, console commands, DB queries, announcements, mail sends, and more — with user, IP, timestamp, and success/failure status

**Other**
- **IP Allowlist** — Backend access restricted to a configurable list of IPs (default: localhost only)
- **Role-based access** — GM level controls what each user can see and do

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A running AzerothCore MySQL instance (`acore_auth`, `acore_world`, `acore_characters`)
- A database user with read/write access to those three databases, plus the `acore_dashboard` database (see [Audit Log setup](#audit-log-setup))

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/Kitzunu/Dashboard.git
cd Dashboard
```

**2. Install all dependencies**

```bash
npm run install:all
```

**3. Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your values — see the [Configuration](#configuration) section below for all options.

**4. Start the dashboard**

```bash
npm start
```

Then open [http://localhost:5173](http://localhost:5173) and log in with your AzerothCore account credentials.

## Configuration

All configuration is done via the `.env` file in the project root.

### Server Paths

```env
# Paths to the server executables (required)
WORLDSERVER_PATH=C:\AzerothCore\worldserver.exe
AUTHSERVER_PATH=C:\AzerothCore\authserver.exe

# Working directories for the server processes (optional — defaults to the exe's directory)
# WORLDSERVER_DIR=C:\AzerothCore
# AUTHSERVER_DIR=C:\AzerothCore

# Host and port used for TCP latency measurement (optional — defaults below)
# WORLDSERVER_HOST=127.0.0.1
# WORLDSERVER_PORT=8085
```

### Config Files

```env
# Directory containing .conf files (optional).
# When set, all .conf files in this directory are loaded in the Config page —
# worldserver.conf and authserver.conf appear first, then module configs alphabetically.
# Without this, worldserver.conf and authserver.conf are read from the exe directory.
# CONFIG_PATH=C:\AzerothCore\configs
```

### Database

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=acore
DB_PASSWORD=acore
AUTH_DB=acore_auth
WORLD_DB=acore_world
CHARACTERS_DB=acore_characters
DASHBOARD_DB=acore_dashboard
```

### Application

```env
# JWT secret — must be a strong random value
JWT_SECRET=change-this-to-a-random-secret

# Backend port (default: 3001)
PORT=3001

# Comma-separated IPs allowed to reach the backend (default: localhost only)
# Add your LAN/WAN IP here if you need remote access
ALLOWED_IPS=127.0.0.1,::1

# Frontend URL for CORS (default: http://localhost:5173)
FRONTEND_URL=http://localhost:5173
```

> Generate a strong `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Session Idle Timeout

```env
# Auto-logout after this many minutes of inactivity (default: disabled).
# Set to 0 or leave blank to disable.
# IDLE_TIMEOUT_MINUTES=30
```

When set, a 60-second warning modal appears before the session expires. Any mouse movement, click, key press, or scroll resets the timer. The value is sent to the frontend at login so no Vite rebuild is needed after changing it.

### Audit Log Retention

```env
# Delete audit log entries older than this many days.
# Set to 0 or leave blank (default) to keep logs forever.
# AUDIT_LOG_RETENTION_DAYS=90
```

When set, the backend runs a purge on startup and then once every 24 hours, deleting rows from `audit_logs` whose `created_at` is older than the configured number of days.

### DBC Files (Optional)

```env
# Path to the WotLK 3.3.5a client DBFilesClient folder.
# Required for human-readable map and zone names in Players, Lag Reports, and Bug Reports.
# Without this, raw map/area IDs are shown as fallback.
# DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient
```

Files used: `Map.dbc` (map names) and `AreaTable.dbc` (zone/area names).

## Access Levels

The dashboard uses AzerothCore's `account_access` GM levels for role-based access.

| Level | Role          | Access |
|-------|---------------|--------|
| 1     | Moderator     | Overview, Console, Players (view), Tickets (view), Lag Reports, Bug Reports, Spam Reports (view), Channels (view) |
| 2     | Game Master   | + Kick/ban players, manage bans, announcements, send mail, accounts (view/lock/ban/mute), autobroadcast (add/edit), mail server (view), dismiss reports, delete spam reports, unban channel players |
| 3     | Administrator | + Start/stop servers, scheduled restart, MOTD, DB Query, Config editor, autobroadcast (delete), accounts (GM level/email/password/create/delete), mail server (create/edit/delete), alert thresholds, clear all lag/spam reports, delete channels, Audit Log |

To grant GM level 3 (Administrator):

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```

## Audit Log Setup

The Audit Log requires a separate `acore_dashboard` database. Create it once by running the included SQL file as a privileged user:

```bash
mysql -u root -p < sql/acore_dashboard.sql
```

This will:
1. Create the `acore_dashboard` database
2. Grant full access to the `acore@localhost` user
3. Create the `audit_logs` table with indexes

> If your MySQL user connects from a host other than `localhost` (e.g. `acore@%`), edit the `GRANT` line in `sql/acore_dashboard.sql` before running.

The dashboard will also auto-create the database and table on first startup if the configured user has `CREATE DATABASE` privileges — the SQL file is provided as a reliable, explicit alternative.

### What is logged

Every action that makes a change is recorded with the acting user, their IP address, a timestamp, and a details string describing what changed:

| Category | Actions logged |
|---|---|
| Auth | Login (success + reason for failure), logout |
| Accounts | Create, delete, set GM level, lock/unlock, set email, reset password, mute/unmute |
| Bans | Ban account/character/IP, unban all three types |
| Servers | Start, stop, scheduled restart, cancel restart |
| MOTD | Full new MOTD text recorded on every change |
| Config | File name + every changed `key: "old" → "new"` pair |
| Announcements | Type and full message text |
| Console | Every GM command executed |
| DB Query | Database name and first 200 characters of the query |
| Autobroadcast | Create (text + weight), update, delete |
| Mail Server | Template create, update (subject + active state), delete |
| Mail | Recipient, subject, and type (text/items/money) |
| Channels | Unban player, delete channel |
| Bug Reports | State change, assignee, comment updates |
| Spam Reports | Delete individual report, clear all |

## Running

```bash
# Start backend and frontend together
npm start

# Or separately
npm run start:backend   # Express backend on port 3001
npm run start:frontend  # Vite frontend on port 5173
```

## Pages

### Overview
- Live server status cards (PID, uptime timer) for worldserver and authserver
- Player Online, Open Tickets, and Active Bans stat cards
- System Memory and CPU usage bars; turn amber then red when alert thresholds are exceeded
- Configurable alert thresholds (⚙ button, Administrator only); saved to `backend/thresholds.json`
- Browser alert notifications (🔔 button) with audio cues — ascending beep for CPU, descending for memory; fires once per threshold crossing
- Worldserver TCP latency panel — mean, median, P95, P99, and max over a rolling 60-minute window
- Player count sparkline over the last hour (up to 120 data points sampled every 30 s)
- AzerothCore core revision (clickable link to GitHub commit), DB version, cache ID, and current MOTD
- Auto-refreshes every 30 seconds

### Console
- Live log streaming for worldserver and authserver via Socket.IO
- Full ANSI SGR colour rendering — log colours from `worldserver.conf` render correctly
- GM command input with up/down arrow history navigation (persisted per session)
- Auto-scroll toggle, saved to `localStorage`

### Players
- Online players with character name, race, class, level, zone (resolved from `AreaTable.dbc` if configured), and account
- Filter by character name or account username
- **Kick** — with optional reason
- **Ban** — character, account, or IP; target pre-filled from selected player
- Auto-refreshes every 30 seconds

### Tickets
- Open GM tickets with player name, message preview, creation time, assigned GM, and status badges
- Expand any row for full detail including GM comment and last response
- **Respond & Close**, **Add Comment**, **Assign/Unassign**, **Escalate/De-escalate**
- Toggle to show all tickets including closed ones
- Open ticket count badge in the sidebar, polled every 60 seconds

### Bans
- Tabs for Account, Character, and IP bans
- Each row shows target, banned by, reason, date, and expiry
- Issue new bans and unban with a confirmation modal

### Announcements
- **Announce** (chat) or **Notify** (on-screen popup) message types
- 200-character limit with live counter; Ctrl+Enter to send
- Six quick-fill templates for common messages
- Session history table of all sent announcements

### Accounts
- Loads all accounts on page open with pagination (50 per page); search by username, email, or IP with ← Prev / Next → page controls
- Account detail view: ID, email, join date, last login, last IP, GM level, expansion, status, and character list with playtime
- **GM Level** change (Administrator), **Expansion** (Administrator), **Email** (Administrator)
- **Ban** with duration presets (1h / 1d / 7d / 30d / permanent) and custom duration
- **Lock / Unlock** (GM 2+), **Reset Password** (Administrator), **Delete Account** (Administrator)
- **Mute / Unmute** per character with duration and reason (Administrator)
- **Create Account** (Administrator)

### Autobroadcast
- Table of all entries with ID, text, and colour-coded weight badge (green ≥ 50, amber 20–49, dim < 20)
- Add, edit, and delete entries

### Send Mail
- Send mail, items (up to 12 by entry ID and count), or money (gold/silver/copper auto-converted to copper)
- Character name and subject are preserved after sending for quick follow-ups

### Channels
- Lists all custom chat channels with name, faction (Alliance / Horde / Both), active ban count, password lock indicator, and last used timestamp
- Lock icon shown for password-protected channels — credentials are never exposed
- Click any row to open the detail panel showing:
  - **Channel Config** — shown when a `channels_rights` entry exists: restriction flags, speak delay, join/delay messages, moderator list
  - **Banned Players** — characters banned from the channel with ban timestamp
- **Unban** removes a player's channel ban (GM 2+)
- **Delete Channel** removes the channel and all associated bans from the database (Administrator)
- Note: in-game member roles (Owner, Moderator, Muted) are runtime-only and not persisted to the database

### Servers
- Start and stop worldserver and authserver
- **Exit** — immediate clean shutdown via `server exit`
- **Shutdown** — `server shutdown <N>` countdown with configurable delay
- **Auto-restart** — toggle per server; restarts on unexpected crashes only, not manual stops
- **Scheduled Restart** — preset delays (1m–1h) or custom value; cancel button available
- **MOTD** — read and edit via `server set motd`; unsaved-changes indicator

### DB Query
- Select auth, world, or characters database
- Run arbitrary SQL and view results in a scrollable table

### Config
- Tab per config file — worldserver and authserver always first, then module configs alphabetically
- Set `CONFIG_PATH` to auto-load all `.conf` files from a directory (useful for AzerothCore module configs)
- Without `CONFIG_PATH`, worldserver.conf and authserver.conf are loaded from the exe directory
- Monospace editor with line numbers, find bar, unsaved-change indicators
- **Save** creates a `.bak` backup of the previous file automatically
- **Discard** reverts all unsaved edits

### Lag Reports
- Paginated table (50 per page) of player-submitted lag events
- Filter by type (Loot / Auction House / Mail / Chat / Movement / Spells & Abilities) and minimum latency
- Summary bar: total reports, average latency, peak latency, per-type counts
- Top 5 most-reporting characters and top 5 most-affected maps
- Colour-coded latency badges; **Dismiss** per row (GM 2+); **Clear All** (Administrator)

### Bug Reports
- Paginated table (25 per page) separated into **Open** and **Closed** tabs; type filter (All / Bugs / Suggestions / Surveys)
- **Search** by character name, zone, subject, assignee, or any field in the report — filters server-side across all pages
- **Sortable columns** — click any column header to sort ascending/descending on the current page
- Table shows assignee; inline **Close / Reopen** button per row (GM 2+)
- Detail modal shows description, reporter info, location, system specs, aura list, addon data, and state badge
- Editable **Assignee** and **Comment** fields in the detail modal (GM 2+)
- **Close / Reopen** toggle in the modal footer (GM 2+)
- **Dismiss** removes the report from the database (GM 2+)

### Audit Log *(Administrator only)*
- Paginated table (50 per page) of all dashboard actions, newest first
- **Success / Failed / All** tab filter — failed logins and blocked actions are highlighted in red
- **Action filter** — searchable multi-select dropdown to show only specific action types (e.g. `config.save`, `ban.account`); multiple actions can be selected simultaneously
- **Search** across username, IP, action, and details — filters server-side across all pages
- **Sortable columns** — ID, time, user, IP, action, status
- Colour-coded action badges by category: account changes (gold), bans (red), server ops (amber), console commands (red), config saves (amber), announcements/mail (green), channels (blue), reports (neutral)
- Config saves show a per-key diff: `WorldServerPort: "8085" → "8086"` so you can see exactly what changed
- Stored in the separate `acore_dashboard` database — unaffected by AzerothCore upgrades

### Mail Server
- Template list with ID, active status, subject, per-faction money, item count, condition count, and recipient count
- Create/Edit modal with four tabs: **General** (subject, body, Alliance/Horde money, active toggle), **Items** (per-faction item attachments), **Conditions** (eligibility rules: Level, PlayTime, Quest, Achievement, Reputation, Faction, Race, Class, AccountFlags), **Recipients** (characters who have already received the template — edit only)
- Items and conditions can be added before saving when creating a new template; they are batch-created alongside the template on save
- Delete with confirmation (cascades to items, conditions, and recipients)

## Project Structure

```
Dashboard/
├── backend/
│   ├── middleware/
│   │   ├── auth.js                # JWT verification and GM level guards
│   │   └── ipAllowlist.js         # IP allowlist enforcement
│   ├── routes/
│   │   ├── accounts.js            # Account management
│   │   ├── announcements.js       # Announce / notify broadcasts
│   │   ├── auditLogRoutes.js      # Audit Log read endpoint (Administrator)
│   │   ├── auth.js                # SRP6 login + rate limiting + logout
│   │   ├── autobroadcast.js       # Autobroadcast CRUD
│   │   ├── bans.js                # Ban management
│   │   ├── bugreports.js          # Bug report browser
│   │   ├── channels.js            # Chat channel browser and management
│   │   ├── config.js              # Config file read/write with diff logging
│   │   ├── console.js             # GM command execution
│   │   ├── db.js                  # Arbitrary SQL query endpoint
│   │   ├── dbc.js                 # Map/area name lookup endpoints
│   │   ├── lagreports.js          # Lag report browser
│   │   ├── mail.js                # Send in-game mail/items/money
│   │   ├── mailserver.js          # Mail server template CRUD
│   │   ├── overview.js            # Dashboard summary endpoint
│   │   ├── players.js             # Online players, kick, ban
│   │   ├── servers.js             # Server start/stop/status/logs
│   │   ├── servertools.js         # Scheduled restart, MOTD
│   │   ├── spamreports.js         # Spam report browser
│   │   ├── thresholds.js          # CPU/memory alert thresholds
│   │   └── tickets.js             # GM ticket CRUD
│   ├── audit.js                   # Audit log helper (fire-and-forget write to acore_dashboard)
│   ├── db.js                      # MySQL connection pools (auth, world, characters, dashboard)
│   ├── dbc.js                     # WotLK DBC binary parser
│   ├── latencyMonitor.js          # TCP latency sampling + rolling stats
│   ├── playerHistory.js           # Rolling player count history buffer
│   ├── processManager.js          # Server process lifecycle + Socket.IO broadcast
│   ├── thresholds.js              # Threshold JSON persistence
│   ├── thresholds.json            # Persisted alert threshold values
│   └── server.js                  # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AccountsPage.jsx
│       │   ├── AnnouncePage.jsx
│       │   ├── AuditLogPage.jsx
│       │   ├── AutobroadcastPage.jsx
│       │   ├── BansPage.jsx
│       │   ├── BugReportsPage.jsx
│       │   ├── ChannelsPage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── LagReportsPage.jsx
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── MailPage.jsx
│       │   ├── MailServerPage.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ServersPage.jsx
│       │   ├── SpamReportsPage.jsx
│       │   └── TicketsPage.jsx
│       ├── ansi.js                # ANSI SGR colour parser
│       ├── api.js                 # Fetch wrapper with JWT auth and 401 handling
│       ├── App.jsx                # Auth context and page routing
│       ├── socket.js              # Socket.IO client
│       └── toast.js               # Global toast notification helper
├── sql/
│   └── acore_dashboard.sql        # One-time setup: creates acore_dashboard DB, grants access, creates audit_logs table
├── .env.example
└── package.json                   # Root scripts (start, install:all)
```

## Notes

- The dashboard spawns `worldserver.exe` and `authserver.exe` as child processes. If the backend exits, the game servers will stop too.
- **Auto-restart** tracks intentional stops via a flag — it only restarts on unexpected crashes, not manual stops from the dashboard.
- **Authentication** uses AzerothCore's SRP6 verifier (salt + verifier columns) — no plain-text passwords are ever compared or stored.
- Login is rate-limited to 10 attempts per 15 minutes per IP.
- JWT session tokens expire after 8 hours; the frontend automatically redirects to the login page on expiry.
- **Idle timeout** — if `IDLE_TIMEOUT_MINUTES` is set, a warning modal counts down the last 60 seconds before auto-logout. User activity (mouse, keyboard, scroll) resets the timer.
- Console log buffers are capped at 2000 lines per server process.
- **Audit Log** writes are fire-and-forget — a failure to write an audit entry never blocks or errors the main operation. The `acore_dashboard` database is kept separate from the AzerothCore databases so it is never affected by core upgrades or migrations.

## Credits

- **[AzerothCore](https://www.azerothcore.org/)** — the open-source World of Warcraft emulator this dashboard is built for
- **Development** — assisted by [Claude Code](https://claude.ai/code) (Anthropic)
