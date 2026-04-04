# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage players, stream live console output, handle GM tickets, edit config files, and more — all from your browser.

## Table of Contents

<details>
  <summary>Table of Contents</summary>

  - [AzerothCore Dashboard](#azerothcore-dashboard)
    - [Table of Contents](#table-of-contents)
    - [Features](#features)
    - [Requirements](#requirements)
    - [Installation](#installation)
    - [Configuration](#configuration)
      - [Server Paths](#server-paths)
      - [Config Files](#config-files)
      - [Database](#database)
      - [Application](#application)
      - [LAN / Remote Access](#lan--remote-access)
      - [Scheduled Tasks](#scheduled-tasks)
      - [Character Dumps (pdump)](#character-dumps-pdump)
      - [Discord Alerts](#discord-alerts)
      - [Session Idle Timeout](#session-idle-timeout)
      - [Audit Log Retention](#audit-log-retention)
      - [DBC Files (Optional)](#dbc-files-optional)
    - [Access Levels](#access-levels)
    - [Audit Log Setup](#audit-log-setup)
      - [What is logged](#what-is-logged)
    - [Running](#running)
    - [Pages](#pages)
      - [Overview](#overview)
      - [Console](#console)
      - [Players](#players)
      - [Tickets](#tickets)
      - [Bans](#bans)
      - [Announcements](#announcements)
      - [Accounts](#accounts)
      - [Autobroadcast](#autobroadcast)
      - [Send Mail](#send-mail)
      - [Guilds](#guilds)
      - [Arena Teams](#arena-teams)
      - [Channels](#channels)
      - [Servers](#servers)
      - [DB Query](#db-query)
      - [Config](#config)
      - [Lag Reports](#lag-reports)
      - [Bug Reports](#bug-reports)
      - [Settings *(Administrator only)*](#settings-administrator-only)
      - [Audit Log *(Administrator only)*](#audit-log-administrator-only)
      - [Characters](#characters)
      - [Name Filters](#name-filters)
      - [Dashboard Management *(Administrator only)*](#dashboard-management-administrator-only)
      - [Mail Server](#mail-server)
    - [Project Structure](#project-structure)
    - [Notes](#notes)
    - [Credits](#credits)
</details>

## Features

**Server**
- **Overview** — Server status cards with live uptime timers, online player/ticket/ban counts, system memory and CPU bars with rolling 60-minute history graphs and configurable alert thresholds (threshold shown as dashed line on graph), browser notifications with audio cues, Discord webhook alerts, worldserver TCP latency stats (mean/median/P95/P99/max over a rolling 60-minute window), and a player count sparkline
- **Console** — Real-time worldserver and authserver log streaming via Socket.IO with full ANSI colour rendering, GM command input, persistent per-session command history, and auto-scroll toggle
- **Servers** — Start, stop, scheduled restart, auto-restart toggle, and MOTD editor for worldserver and authserver
- **Autobroadcast** — Manage the in-game autobroadcast rotation: add, edit, delete, and weight messages
- **Mail Server** — Full CRUD editor for the `mail_server_template` system with subject, body, per-faction money and items, eligibility conditions, and a recipients list
- **DB Query** — Run SQL queries against the auth, world, or characters databases
- **Scheduled Tasks** — Schedule recurring database backups and server restarts by time of day and day of week; run any task immediately with Run Now
- **Config** — Edit worldserver.conf, authserver.conf, and any module `.conf` files directly in the browser with line numbers, a find bar, unsaved-change indicators, and automatic `.bak` backups

**Game**
- **Tickets** — View, respond to, comment on, assign, escalate, and close GM tickets; sidebar badge shows open ticket count
- **Bans** — Three-tab view of active account, character, and IP bans; issue new bans and unban with confirmation
- **Mutes** — List of all active account mutes with expiry and time remaining; issue new mutes and unmute with confirmation
- **Announce** — Broadcast server-wide messages (chat announce or on-screen notify) with quick-fill templates and session history
- **Send Mail** — Send in-game mail, items (up to 12), or money (gold/silver/copper) to any character
- **Channels** — Browse all active chat channels; view banned players and channel config (rights, speak delay, messages); lock icon for password-protected channels; unban players (GM 2+); delete channel (Administrator)
- **Name Filters** — View, add, and remove entries in the `profanity_name` and `reserved_name` tables; tabbed interface with live filter and per-entry remove (GM 2+)

**Players**
- **Players** — Live online player list with race, class, level, zone, and account; filter by name or account; kick with optional reason; ban by character, account, or IP
- **Accounts** — Search by username, email, or IP; view full account detail and characters; set GM level, expansion, email, lock/unlock, reset password, mute/unmute characters, create accounts, and delete accounts
- **Characters** — Search all characters by name; detail panel with eight tabs: Overview (money, honor/arena points, played time, currency), Stats (base stats, health/power, combat stats, resistances), Equipment (all 19 slots with WoWHead tooltips), Bags (backpack + 4 bag slots), Bank (main bank + 7 bank bag slots), Auras (active buffs/debuffs with duration), Reputation (all factions with standing label, progress bar, and at-war indicator), and Achievements (grouped by category with completion date). **Export Dump** — generate a `.pdump`-compatible SQL dump for any character (download to browser or save to a server path). **Import Dump** — load a dump file into any account with full GUID remapping compatible with the AzerothCore `.pdump load` command
- **Guilds** — Browse all guilds with leader, member count, and bank balance; detail panel with member roster (class, level, rank), rank list with bank gold per day, and event log (invites, joins, promotions, demotions, kicks, leaves); tabard colour preview
- **Arena Teams** — Browse all arena teams sorted by rating with captain, bracket type (2v2/3v3/5v5), and member count; search by name or captain; filter by bracket; detail panel with season/weekly stats, member roster with personal ratings, and match history (per-player MMR); create teams (GM 3+), edit rating/captain (GM 3+), delete teams (GM 3+), remove members (GM 2+)

**Reports**
- **Lag Reports** — Browse player-submitted lag events; filter by type and minimum latency; aggregate stats with top reporters and top maps; dismiss or clear all
- **Bug Reports** — Browse FeedbackUI bug reports, suggestions, and feedback; separated into Open/Closed tabs with type filter; assignee and comment fields; close/reopen per report

**Dashboard**
- **Alerts** — Persistent log of all system alerts stored in the `acore_dashboard` database: latency warning/critical threshold breaches, CPU/memory threshold breaches, server crash/online transitions, and agent disconnects — each with severity badge, type, description, metadata (values and thresholds), and timestamp; filter by severity and type, view detail modal with raw metadata, delete individual entries or clear all *(visible to GM level 1+; clear requires Administrator)*
- **Audit Log** — Immutable record of all critical actions taken through the dashboard: logins (including failed attempts with reason), logouts, server start/stop/restart, config saves (with changed key→value diff), MOTD changes, bans/unbans, account changes, console commands, DB queries, announcements, mail sends, and more — with user, IP, timestamp, and success/failure status *(Administrator only)*
- **Settings** — Dashboard-wide configuration stored in the `acore_dashboard` database; settings changes are audit-logged; Discord alert toggles per event type. Also includes an **Environment (.env)** section for editing whitelisted `.env` keys directly from the UI (requires backend restart to apply) *(Administrator only)*
- **Dashboard Management** — Restart the backend, server agent, or frontend from the UI; each action requires confirmation; agent restart includes a clear warning that game servers will be temporarily unmanaged *(Administrator only)*

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

### LAN / Remote Access

By default the dashboard is only accessible from the machine it runs on. To access it from another device on the same network:

1. Set `ALLOWED_IPS` to include the IP(s) that will connect to the backend:
   ```env
   ALLOWED_IPS=127.0.0.1,::1,192.168.1.50
   ```
2. Set `FRONTEND_URL` to the address the frontend will be served from (used for CORS):
   ```env
   FRONTEND_URL=http://192.168.1.100:5173
   ```
3. Open the dashboard on the remote device using the server's LAN IP, e.g. `http://192.168.1.100:5173`. The frontend automatically connects the API and WebSocket back to the same host — no additional configuration needed.

### Scheduled Tasks

```env
# Directory where mysqldump backup files are saved (created automatically).
# BACKUP_PATH=C:\AzerothCore\backups

# Full path to mysqldump — only needed if it is not in your system PATH.
# MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
```

Backups are saved as `<database>_YYYY-MM-DD_HH-mm.sql` files.

The scheduler checks every minute and fires tasks whose time and day-of-week match. If `mysqldump` is on your system `PATH` you do not need to set `MYSQLDUMP_PATH`.

For scheduled restarts, the target server's Auto-Restart is automatically enabled before the shutdown command is sent so the server agent brings it back up after the countdown.

### Character Dumps (pdump)

```env
# Default output directory for character dump exports.
# The "Save on server" mode in the Export Dump modal pre-fills the path as
# <PDUMP_OUTPUT_PATH>/<CharacterName>_<GUID>.sql so no typing is required.
# The directory is created automatically if it does not exist.
# Defaults to ./pdump (a folder named "pdump" inside the project root).
PDUMP_OUTPUT_PATH=./pdump
```

Dumps are plain SQL files of INSERT statements compatible with AzerothCore's `.pdump load` command. They capture the full character: inventory, bank, mail, pets, spells, achievements, reputation, and more across all 31 character tables.

The export produces a file named `<CharacterName>_<GUID>_<timestamp>.sql`. When importing, all GUIDs (characters, items, mail, pets, equipment sets) are automatically remapped to avoid conflicts with existing data. If the requested character name is already taken, a temporary name is assigned and the character is flagged to rename on next login.

### Discord Alerts

```env
# Discord channel webhook URL.
# When set, the dashboard posts alerts to this webhook for the events enabled in Settings.
# Leave blank (or omit) to disable all Discord notifications.
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
```

Four alert types are supported, each with an independent toggle in **Settings → Discord Alerts**:

| Alert              | Trigger                                                                | Cooldown           |
| ------------------ | ---------------------------------------------------------------------- | ------------------ |
| Server offline     | worldserver or authserver transitions from running → offline           | 5 min per server   |
| Server online      | worldserver or authserver transitions from offline → running           | 5 min per server   |
| Resource threshold | CPU or memory usage exceeds the configured threshold                   | 5 min per resource |
| Agent disconnect   | Server agent loses its SSE connection to the dashboard                 | 5 min              |
| Latency threshold  | Mean TCP latency to worldserver exceeds the warn or critical threshold | 5 min per level    |

Use the **Send Test Message** button in Settings to verify the webhook is working.

> Create a Discord webhook via **Channel Settings → Integrations → Webhooks → New Webhook**, then copy the URL.

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
# Required for human-readable map, zone, race, and class names in Players and Accounts.
# Without this, raw IDs are shown as fallback.
# DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient
```

Files used: `Map.dbc` (map names), `AreaTable.dbc` (zone/area names), `ChrRaces.dbc` (race names), and `ChrClasses.dbc` (class names).

## Access Levels

The dashboard uses AzerothCore's `account_access` GM levels for role-based access.

| Level | Role          | Access                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Moderator     | Overview, Console, Players (view), Tickets (view), Lag Reports, Bug Reports, Spam Reports (view), Channels (view), Guilds (view), Arena Teams (view), Characters (view)                                                                                                                                                                                                      |
| 2     | Game Master   | + Kick/ban players, manage bans, mutes, announcements, send mail, accounts (view/lock/ban/mute), autobroadcast (add/edit), mail server (view), dismiss reports, delete spam reports, unban channel players, name filters (view/add/remove), export/import character dumps, remove arena team members                                                                         |
| 3     | Administrator | + Start/stop servers, scheduled restart, MOTD, DB Query, Config editor, scheduled tasks, autobroadcast (delete), accounts (GM level/email/password/flags/create/delete), mail server (create/edit/delete), alert thresholds, clear all lag/spam reports, delete channels, Audit Log, Settings (including .env editor), Dashboard Management (restart backend/agent/frontend), create/edit/delete arena teams |

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

| Category        | Actions logged                                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | Login (success + reason for failure), logout                                                                                                                                      |
| Accounts        | Create, delete, set GM level, lock/unlock, set email, reset password, mute/unmute                                                                                                 |
| Bans            | Ban account/character/IP, unban all three types                                                                                                                                   |
| Servers         | Start, stop, scheduled restart, cancel restart                                                                                                                                    |
| MOTD            | Full new MOTD text recorded on every change                                                                                                                                       |
| Config          | File name + every changed `key: "old" → "new"` pair                                                                                                                               |
| Announcements   | Type and full message text                                                                                                                                                        |
| Console         | Every GM command executed                                                                                                                                                         |
| DB Query        | Database name and first 200 characters of the query                                                                                                                               |
| Autobroadcast   | Create (text + weight), update, delete                                                                                                                                            |
| Mail Server     | Template create, update (subject + active state), delete                                                                                                                          |
| Mail            | Recipient, subject, and type (text/items/money)                                                                                                                                   |
| Channels        | Unban player, delete channel                                                                                                                                                      |
| Bug Reports     | State change, assignee, comment updates                                                                                                                                           |
| Spam Reports    | Delete individual report, clear all                                                                                                                                               |
| Name Filters    | Add profanity name, remove profanity name, add reserved name, remove reserved name                                                                                                |
| Character Dumps | Export dump (`pdump.write` — character name, GUID, output path or download), import dump (`pdump.load` — character name, GUID, target account, source; failure logged with error) |
| Arena Teams     | Create team (name, type, captain), update team (rating, captain), delete team, remove member                                                                                      |
| Scheduled Tasks | Create, update, delete, run now                                                                                                                                                   |
| Settings        | All setting changes (key=value pairs)                                                                                                                                             |
| Environment     | `.env` key changes with before→after values                                                                                                                                       |
| Dashboard       | Restart backend, restart agent, restart frontend                                                                                                                                  |

## Running

```bash
# Start agent, backend, and frontend together
npm start

# Or separately
npm run start:server-agent  # Server agent on port 3002 (manages game servers)
npm run start:backend       # Express backend on port 3001
npm run start:frontend      # Waits for backend health check, then starts Vite on port 5173
```

`npm start` launches all three processes concurrently but the frontend is gated on the backend's `/api/health` endpoint — Vite will not start until the backend HTTP server is accepting connections. This prevents the browser from hitting the API before CORS and routing are fully initialised.

The **server agent** (`serverAgent.js`) is a separate process that owns the worldserver and authserver child processes. Because it runs independently, restarting the dashboard backend does not kill the game servers. The dashboard backend reconnects to the agent automatically when it comes back up.

Both the backend and the server agent are wrapped by lightweight runner scripts (`run.js` and `runAgent.js`) that automatically restart their respective process when it exits with code 42. This is how the **Restart Backend** and **Restart Agent** buttons in Dashboard Management work.

## Pages

### Overview
- Live server status cards (PID, uptime timer) for worldserver and authserver; Dashboard card showing backend and server agent connectivity
- Player Online, Open Tickets, and Active Bans stat cards
- System Memory and CPU usage bars; turn amber then red when alert thresholds are exceeded
- Configurable alert thresholds (⚙ button, Administrator only); saved to `backend/thresholds.json`
- **Alerts** dropdown — independently toggle popup notifications and alert sounds; sounds use the Web Audio API (no external files); popup notifications require browser permission; both settings persist in `localStorage`
- Worldserver TCP latency panel — mean, median, P95, P99, and max over a rolling 60-minute window
- Player count sparkline over the last hour (up to 120 data points sampled every 30 s)
- AzerothCore core revision (clickable link to GitHub commit), DB version, cache ID, and current MOTD
- Real-time push updates via Socket.IO (no polling)

### Console
- Live log streaming for worldserver and authserver via Socket.IO
- Full ANSI SGR colour rendering — log colours from `worldserver.conf` render correctly
- GM command input with up/down arrow history navigation (persisted per session)
- Auto-scroll toggle, saved to `localStorage`

### Players
- Online players with character name, race (resolved from `ChrRaces.dbc` if configured), class (resolved from `ChrClasses.dbc` if configured), level, zone (resolved from `AreaTable.dbc` if configured), and account
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
- **Account Flags** — view active flags for any account; toggle individual flags (Administrator)
- **Create Account** (Administrator)

### Autobroadcast
- Table of all entries with ID, text, and colour-coded weight badge (green ≥ 50, amber 20–49, dim < 20)
- Add, edit, and delete entries

### Send Mail
- Send mail, items (up to 12 by entry ID and count), or money (gold/silver/copper auto-converted to copper)
- Character name and subject are preserved after sending for quick follow-ups

### Guilds
- Guild list with name, leader, member count, and bank balance
- Search by guild name or leader
- Click any guild to open the detail panel showing:
  - **Tabard** — colour preview (background, border, emblem) with style indices
  - **MOTD** and guild info text (when set)
  - **Members** tab — character name, class, level, and rank; personal note shown
  - **Ranks** tab — rank name and bank gold withdrawal limit per day
  - **Event Log** tab — last 100 entries: invites, joins, promotions, demotions, kicks, and leaves with timestamps and player names

### Arena Teams
- Arena team list sorted by rating with team name, bracket type (2v2/3v3/5v5), captain name, rating, and member count
- Search by team name or captain name; filter by bracket type
- Click any team to open the detail panel showing:
  - Header with captain name, bracket, rating, and rank
  - Season and weekly performance summary (wins/losses/win %)
  - **Members** tab — roster with class, level, personal rating, season stats (wins/losses/win %), and weekly stats; captain badge shown
  - **Stats** tab — full team statistics: rating, rank, season games/wins/losses/win %, week games/wins/losses/win %
  - **Match History** tab — per-player matchmaker rating (MMR) and max MMR
- **Create Team** (GM 3+) — create a new arena team with custom name, bracket type, and captain selected via character search
- **Edit Team** (GM 3+) — update team rating and reassign captain to any current member
- **Delete Team** (GM 3+) — permanently remove a team and all its members
- **Remove Member** (GM 2+) — remove individual members (captain must transfer captainship first)

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
- Preset queries for common lookups (online players, accounts, bans, inventory)
- Free-form SQL editor — click a preset to load it into the editor, then modify and run; or type any query directly
- Ctrl+Enter to run from the editor
- Supports SELECT (tabular results) and write queries INSERT/UPDATE/DELETE (affected rows count)
- All queries are audit-logged with the executing user, IP, database, and query text

### Config
- Tab per config file — worldserver and authserver always first, then module configs alphabetically
- Set `CONFIG_PATH` to auto-load all `.conf` files from a directory and its subdirectories (useful for AzerothCore module configs)
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

### Settings *(Administrator only)*
- Sections with labelled toggle/input controls, each with a description
- Changes are only sent on **Save Changes** (dirty-tracking — no unnecessary writes)
- Settings changes are recorded in the Audit Log

**Available settings:**

| Setting                                     | Default               | Description                                                                              |
| ------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Config Editor → Create .bak backup on save  | On                    | Creates a `.bak` copy of each config file before overwriting                             |
| Discord Alerts → Enable Discord alerts      | On                    | Master switch — when off, no messages are sent                                           |
| Discord Alerts → Display name               | AzerothCore Dashboard | Name shown on Discord messages (overrides webhook default)                               |
| Discord Alerts → Avatar URL                 | *(dashboard icon)*    | Direct image URL used as the bot avatar; defaults to the dashboard icon hosted on GitHub |
| Discord Alerts → Server offline alert       | On                    | Posts to Discord when worldserver or authserver goes offline unexpectedly                |
| Discord Alerts → Server offline message     | *see below*           | Editable message body; supports `{server}`                                               |
| Discord Alerts → Server online alert        | On                    | Posts to Discord when worldserver or authserver comes back online                        |
| Discord Alerts → Server online message      | *see below*           | Editable message body; supports `{server}`                                               |
| Discord Alerts → Resource threshold alert   | On                    | Posts to Discord when CPU or memory exceeds the configured threshold (5-minute cooldown) |
| Discord Alerts → Resource threshold message | *see below*           | Editable message body; supports `{resource}`, `{pct}`, `{threshold}`                     |
| Discord Alerts → Agent disconnect alert     | On                    | Posts to Discord when the server agent loses its connection                              |
| Discord Alerts → Agent disconnect message   | *see below*           | Editable message body; no variables                                                      |

All sections are collapsible. A gold "unsaved changes" badge appears on any collapsed section that has pending edits.

**Environment (.env) settings** — a separate collapsible section at the bottom of the page for editing whitelisted `.env` keys directly from the UI. Changes are written to the `.env` file on disk and require a backend restart to take effect. Settings affecting server executables (`WORLDSERVER_PATH`, `AUTHSERVER_PATH`, `*_DIR`) also require restarting the server agent. A **Restart Backend** button appears in the warning banner after saving. The following keys are editable:

| Key                                     | Description                                              |
| --------------------------------------- | -------------------------------------------------------- |
| `WORLDSERVER_PATH` / `AUTHSERVER_PATH`  | Paths to game server executables                         |
| `WORLDSERVER_DIR` / `AUTHSERVER_DIR`    | Working directories for game server processes            |
| `WORLDSERVER_HOST` / `WORLDSERVER_PORT` | Host/port used for TCP latency measurement               |
| `DBC_PATH`                              | Path to WotLK DBFilesClient folder                       |
| `CONFIG_PATH`                           | Directory containing `.conf` files for the Config editor |
| `BACKUP_PATH`                           | Where scheduled backup files are saved                   |
| `MYSQLDUMP_PATH`                        | Path to `mysqldump` executable                           |
| `PDUMP_OUTPUT_PATH`                     | Default directory for character dump exports             |
| `FRONTEND_URL`                          | Comma-separated CORS origins                             |
| `ALLOWED_IPS`                           | Comma-separated IPs allowed to reach the backend         |
| `IDLE_TIMEOUT_MINUTES`                  | Session idle timeout                                     |
| `AUDIT_LOG_RETENTION_DAYS`              | Audit log retention period                               |
| `DISCORD_WEBHOOK_URL`                   | Discord alert webhook URL                                |

### Audit Log *(Administrator only)*
- Paginated table (50 per page) of all dashboard actions, newest first
- **Success / Failed / All** tab filter — failed logins and blocked actions are highlighted in red
- **Action filter** — searchable multi-select dropdown to show only specific action types (e.g. `config.save`, `ban.account`); multiple actions can be selected simultaneously
- **Search** across username, IP, action, and details — filters server-side across all pages
- **Sortable columns** — ID, time, user, IP, action, status
- Colour-coded action badges by category: account changes (gold), bans (red), server ops (amber), console commands (red), config saves (amber), announcements/mail (green), channels (blue), reports (neutral)
- Config saves show a per-key diff: `WorldServerPort: "8085" → "8086"` so you can see exactly what changed
- Stored in the separate `acore_dashboard` database — unaffected by AzerothCore upgrades

### Characters

- Search all characters by name (min 2 characters); results show race, class, level, and online indicator
- Click any result to open the detail panel with eight tabs:
  - **Overview** — money, played time, honor/arena points, currencies
  - **Stats** — base stats (Str/Agi/Sta/Int/Spi), health and power, combat stats (attack power, crit %, dodge, parry, block, armor, resilience), and all six resistances
  - **Equipment** — all 19 slots with item name, quality colour, and WoWHead tooltips
  - **Bags** — backpack and up to 4 equipped bag slots with item links
  - **Bank** — main bank slots and up to 7 bank bag slots
  - **Auras** — all active buff/debuff auras with spell ID, remaining duration, stacks, and caster
  - **Reputation** — all tracked factions with standing label (Exalted → Hated), progress bar, and At War indicator; filter by standing or at-war state, sortable by standing value
  - **Achievements** — all completed achievements grouped by category with completion date; collapsed categories expand on click

**Export Dump** button (per character, GM 2+):
- Generates a full `.pdump`-compatible SQL file covering all 31 character tables (inventory, bank, mail, pets, spells, achievements, reputation, etc.)
- **Download to browser** — sends the file directly as a `.sql` attachment
- **Save on server** — writes to a path on the backend machine; pre-fills `PDUMP_OUTPUT_PATH` if configured

**Import Dump** button (page-level, GM 2+):
- Accepts a `.sql` dump file (uploaded from the browser) or a server-side file path
- Account selector with live search — assign the imported character to any account
- Optional character name override — if blank, the name from the dump is used; if that name is taken a temporary name (`originalName + GUID_HEX`) is assigned and the character is flagged to rename on next login
- Full GUID remapping for characters, items, mail, pets, and equipment sets — same logic as AzerothCore's native `.pdump load`; compatible with dumps from both the dashboard and the in-game command

### Name Filters
- Two tabs — **Profanity** and **Reserved** — each showing the entry count
- Add a new name (max 12 characters) with inline duplicate and length validation
- Filter the current list by typing; shows match count when filtering
- **Remove** any entry with confirmation modal (GM 2+)
- Actions are audit-logged

### Dashboard Management *(Administrator only)*
- **Restart Backend** — restarts the Express API server; frontend reconnects automatically within a few seconds
- **Restart Server Agent** — restarts the standalone agent process; includes prominent warning that game servers will be temporarily unmanaged (running servers are NOT stopped, but cannot be monitored or auto-restarted during the window)
- **Restart Frontend** — informs the user that the Vite dev server cannot be restarted remotely and must be restarted manually; production static builds do not require restarting
- All actions require a confirmation modal; all are audit-logged

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
│   │   ├── mutes.js               # Mute management
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
│   │   ├── characters.js          # Character search and detail (inventory, bank, reputation, currency)
│   │   ├── pdump.js               # Character dump export (write) and import (load) with full GUID remapping
│   │   ├── guilds.js              # Guild list and detail (members, ranks, event log)
│   │   ├── dashboardManage.js     # Dashboard process restart endpoints (backend, agent, frontend)
│   │   ├── envSettings.js         # .env file read/write for whitelisted keys (Administrator)
│   │   ├── namefilters.js         # profanity_name and reserved_name CRUD
│   │   ├── scheduledTasks.js      # Scheduled task CRUD and run-now trigger
│   │   ├── settingsRoutes.js      # Dashboard settings read/write and Discord webhook test
│   │   ├── spamreports.js         # Spam report browser
│   │   ├── thresholds.js          # CPU/memory alert thresholds
│   │   └── tickets.js             # GM ticket CRUD
│   ├── audit.js                   # Audit log helper (fire-and-forget write to acore_dashboard)
│   ├── alertLogger.js             # Writes system alerts to the dashboard DB alerts table
│   ├── discord.js                 # Discord webhook sender (server offline/online, thresholds, latency, agent disconnect)
│   ├── db.js                      # MySQL connection pools (auth, world, characters, dashboard)
│   ├── dbc.js                     # WotLK DBC binary parser
│   ├── latencyMonitor.js          # TCP latency sampling + rolling stats
│   ├── playerHistory.js           # Rolling player count history buffer
│   ├── resourceHistory.js         # Rolling CPU and memory history buffer
│   ├── run.js                     # Backend runner — restarts server.js on exit code 42
│   ├── runAgent.js                # Agent runner — restarts serverAgent.js on exit code 42
│   ├── serverAgent.js             # Standalone server agent — owns game server processes
│   ├── serverBridge.js            # SSE bridge: forwards server agent events to frontend Socket.IO
│   ├── processManager.js          # Agent HTTP client (async proxy to serverAgent)
│   ├── thresholds.js              # Threshold JSON persistence
│   ├── thresholds.json            # Persisted alert threshold values
│   └── server.js                  # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AccountsPage.jsx
│       │   ├── AnnouncePage.jsx
│       │   ├── AuditLogPage.jsx
│       │   ├── DashboardManagePage.jsx
│       │   ├── AutobroadcastPage.jsx
│       │   ├── BansPage.jsx
│       │   ├── BugReportsPage.jsx
│       │   ├── ChannelsPage.jsx
│       │   ├── CharacterPage.jsx
│       │   ├── GuildsPage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── LagReportsPage.jsx
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── MailPage.jsx
│       │   ├── MailServerPage.jsx
│       │   ├── MutesPage.jsx
│       │   ├── NameFiltersPage.jsx
│       │   ├── ScheduledTasksPage.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ServersPage.jsx
│       │   ├── SpamReportsPage.jsx
│       │   ├── SettingsPage.jsx
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

- Game servers are managed by the standalone **server agent** (`serverAgent.js`), not the dashboard backend. Restarting the backend does not stop the game servers — they keep running and the backend reconnects automatically.
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
