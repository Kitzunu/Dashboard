# Pages

## Layout
- Sidebar navigation with collapsible groups and page links; selecting a page closes the sidebar on mobile
- On screens ≤ 768px the sidebar collapses off-screen and a hamburger toggle (☰) button appears in the top-left corner; tapping the overlay or selecting a page closes the sidebar
- On screens ≤ 480px, spacing and font sizes are further reduced for small phones
- Toast notifications stack in the bottom-right corner (bottom-center on mobile)

## Overview
- Live server status cards (PID, uptime timer) for each configured worldserver and authserver; Dashboard card showing backend and server agent connectivity
- Player Online, Open Tickets, and Active Bans stat cards
- System Memory and CPU usage bars; turn amber then red when alert thresholds are exceeded
- Configurable alert thresholds in **Settings → Alert Thresholds** (Administrator only); persisted to the `acore_dashboard` database
- **Alerts** dropdown — independently toggle popup notifications and alert sounds; sounds use the Web Audio API (no external files); popup notifications require browser permission; both settings persist in `localStorage`
- Worldserver TCP latency panel — mean, median, P95, P99, and max over a rolling 60-minute window; one panel per worldserver when multiple are configured
- Player count sparkline over the last hour (up to 120 data points sampled every 30 s)
- AzerothCore core revision (clickable link to GitHub commit), DB version, cache ID, and current MOTD
- Real-time push updates via Socket.IO (no polling)

## Console
- Live log streaming for each configured worldserver and authserver via Socket.IO — when multiple worldservers are configured, a panel is shown for each
- Full ANSI SGR colour rendering — log colours from `worldserver.conf` render correctly
- GM command input with up/down arrow history navigation (persisted per session); commands are sent to the specific worldserver panel they are entered in
- Auto-scroll toggle, saved to `localStorage`

## Players
- Online players with character name, race (resolved from `ChrRaces.dbc` if configured), class (resolved from `ChrClasses.dbc` if configured), level, zone (resolved from `AreaTable.dbc` if configured), and account
- Filter by character name or account username
- **Kick** — with optional reason
- **Ban** — character, account, or IP; target pre-filled from selected player
- Auto-refreshes every 30 seconds

## Tickets
- Open GM tickets with player name, message preview, creation time, assigned GM, and status badges
- Expand any row for full detail including GM comment and last response
- **Respond & Close**, **Add Comment**, **Assign/Unassign**, **Escalate/De-escalate**
- Toggle to show all tickets including closed ones
- Open ticket count badge in the sidebar, polled every 60 seconds

## Bans
- Tabs for Account, Character, and IP bans
- Each row shows target, banned by, reason, date, and expiry
- Issue new bans and unban with a confirmation modal

## Mutes
- List of all active account mutes with account name, muted by, reason, mute date, and expiry with time remaining
- **Mute** — issue a new mute by character name with duration (minutes) and reason (GM 2+)
- **Unmute** — remove a mute with confirmation modal (GM 2+)
- Actions are audit-logged

## Announcements
- **Announce** (chat) or **Notify** (on-screen popup) message types
- 200-character limit with live counter; Ctrl+Enter to send
- Six quick-fill templates for common messages
- Session history table of all sent announcements

## Accounts
- Loads all accounts on page open with pagination (50 per page); search by username, email, or IP with ← Prev / Next → page controls
- Account detail view: ID, email, join date, last login, last IP, GM level, expansion, status, and character list with playtime
- **GM Level** change (Administrator), **Expansion** (Administrator), **Email** (Administrator)
- **Ban** with duration presets (1h / 1d / 7d / 30d / permanent) and custom duration
- **Lock / Unlock** (GM 2+), **Reset Password** (Administrator), **Delete Account** (Administrator)
- **Mute / Unmute** per character with duration and reason (Administrator)
- **Account Flags** — view active flags for any account; toggle individual flags (Administrator)
- **Create Account** (Administrator)

## Autobroadcast
- Table of all entries with ID, text, and colour-coded weight badge (green ≥ 50, amber 20–49, dim < 20)
- Add, edit, and delete entries

## Send Mail
- Send mail, items (up to 12 by entry ID and count), or money (gold/silver/copper auto-converted to copper)
- Character name and subject are preserved after sending for quick follow-ups

## Guilds
- Guild list with name, leader, member count, and bank balance
- Search by guild name or leader
- Click any guild to open the detail panel showing:
  - **Tabard** — colour preview (background, border, emblem) with style indices
  - **MOTD** and guild info text (when set)
  - **Members** tab — character name, class, level, and rank; personal note shown
  - **Ranks** tab — rank name and bank gold withdrawal limit per day
  - **Event Log** tab — last 100 entries: invites, joins, promotions, demotions, kicks, and leaves with timestamps and player names

## Arena Teams
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

## Channels
- Lists all custom chat channels with name, faction (Alliance / Horde / Both), active ban count, password lock indicator, and last used timestamp
- Lock icon shown for password-protected channels — credentials are never exposed
- Click any row to open the detail panel showing:
  - **Channel Config** — shown when a `channels_rights` entry exists: restriction flags, speak delay, join/delay messages, moderator list
  - **Banned Players** — characters banned from the channel with ban timestamp
- **Unban** removes a player's channel ban (GM 2+)
- **Delete Channel** removes the channel and all associated bans from the database (Administrator)
- Note: in-game member roles (Owner, Moderator, Muted) are runtime-only and not persisted to the database

## Calendar
- Month-view grid with Monday–Sunday columns; today highlighted; previous/next month navigation and "Today" button
- Five event types, each colour-coded and togglable via legend buttons:
  - **Custom Events** (blue) — user-created events with title, optional description, and start/end times
  - **Notes** (gold) — user-created notes
  - **Game Holidays** (green) — WoW game events from the `game_event` table (holiday events only)
  - **In-Game Calendar** (purple) — player-created events from the `calendar_events` table
  - **Raid Resets** (red) — weekly lockout resets for all WotLK 3.3.5a raids (weekly on Wednesday 07:00 UTC)
- Click any day to open a side panel with the day's events; double-click to create a new event (GM 2+)
- **Create / Edit / Delete** custom events and notes (GM 2+); game holidays, in-game events, and raid resets are read-only
- Each day cell shows up to 3 events with a "+N more" overflow indicator
- Custom event actions are audit-logged

## Servers
- Start and stop worldserver(s) and authserver — when multiple worldservers are configured via `worldservers.json`, a card is shown for each
- **Exit** — immediate clean shutdown via `server exit`
- **Shutdown** — `server shutdown <N>` countdown with configurable delay
- **Auto-restart** — toggle per server; restarts on unexpected crashes only, not manual stops
- **Scheduled Restart** — preset delays (1m–1h) or custom value; target server selector when multiple worldservers are configured; cancel button available
- **MOTD** — read and edit via `server set motd`; unsaved-changes indicator

## DB Query
- Select auth, world, or characters database
- Preset queries for common lookups (online players, accounts, bans, inventory)
- Free-form SQL editor — click a preset to load it into the editor, then modify and run; or type any query directly
- Ctrl+Enter to run from the editor
- Supports SELECT (tabular results) and write queries INSERT/UPDATE/DELETE (affected rows count)
- All queries are audit-logged with the executing user, IP, database, and query text

## Config
- Tab per config file — worldserver and authserver always first, then module configs alphabetically
- Set `CONFIG_PATH` to auto-load all `.conf` files from a directory and its subdirectories (useful for AzerothCore module configs)
- Without `CONFIG_PATH`, worldserver.conf and authserver.conf are loaded from the exe directory
- Monospace editor with line numbers, find bar, unsaved-change indicators
- **Save** creates a `.bak` backup of the previous file automatically
- **Discard** reverts all unsaved edits

## Backups *(Administrator only)*
- Table of all backup files in the `BACKUP_PATH` directory with filename, database badge, size, and creation date
- **Create Backup** — opens a modal with checkboxes for each database (acore_auth, acore_characters, acore_world); runs `mysqldump` on the server and saves timestamped `.sql` files; reports created file count and any errors
- **Restore** — per-file button opens a confirmation modal warning that the target database will be overwritten; target database is auto-detected from the filename; pipes the SQL file into the `mysql` client
- **Download** — download any backup file to the browser
- **Delete** — delete with confirmation modal
- Filter by database via a dropdown; file count and total size summary
- All create, restore, and delete actions are audit-logged

## Batch Operations *(Administrator only)*
- Tabbed interface with four operation types: **Batch Kick**, **Batch Ban**, **Batch Mail**, **Batch GM Level**
- Each tab has an inline **Search Picker** — type-ahead autocomplete that searches characters or accounts (debounced, max 15 results) and appends selected entries to a textarea
- Targets can also be entered manually in the textarea (one per line or comma-separated)
- **Batch Kick** — kick multiple online players with an optional reason
- **Batch Ban** — ban by character, account, or IP; duration and reason required
- **Batch Mail** — send in-game mail to multiple recipients with subject and body
- **Batch GM Level** — set GM level (0–3) for multiple account IDs
- Results modal shows per-target success/failure with error messages

## Character Transfer *(Administrator only)*
- Search characters by name (minimum 2 characters); results table with GUID, name, race, class, level, and online status
- Select an offline character to view transfer detail: character info, current account, and transfer eligibility
- Online characters cannot be transferred (disabled Select button)
- **Target Account** — search accounts by name with dropdown picker, or enter an account ID directly
- Confirmation modal shows source/target details and notes that the action will be audit-logged
- Transfer updates the character's `account` column and is audit-logged

## Lag Reports
- Paginated table (50 per page) of player-submitted lag events
- Filter by type (Loot / Auction House / Mail / Chat / Movement / Spells & Abilities) and minimum latency
- Summary bar: total reports, average latency, peak latency, per-type counts
- Top 5 most-reporting characters and top 5 most-affected maps
- Colour-coded latency badges; **Dismiss** per row (GM 2+); **Clear All** (Administrator)

## Bug Reports
- Paginated table (25 per page) separated into **Open** and **Closed** tabs; type filter (All / Bugs / Suggestions / Surveys)
- **Search** by character name, zone, subject, assignee, or any field in the report — filters server-side across all pages
- **Sortable columns** — click any column header to sort ascending/descending on the current page
- Table shows assignee; inline **Close / Reopen** button per row (GM 2+)
- Detail modal shows description, reporter info, location, system specs, aura list, addon data, and state badge
- Editable **Assignee** and **Comment** fields in the detail modal (GM 2+)
- **Close / Reopen** toggle in the modal footer (GM 2+)
- **Dismiss** removes the report from the database (GM 2+)

## Spam Reports
- Paginated table of in-game spam reports with three type filters: **Mail**, **Chat**, and **Calendar**
- **Search** by spammer name or description
- **Sortable columns** — ID, type, reported player, details, time
- Detail modal with full report fields (mail ID, channel, message text, event description, time since message)
- **Delete** individual reports (GM 2+)
- **Clear All** matching current filters with confirmation (Administrator)

## Settings *(Administrator only)*
- Sections with labelled toggle/input controls, each with a description
- Changes are only sent on **Save Changes** (dirty-tracking — no unnecessary writes)
- Settings changes are recorded in the Audit Log

**Available settings:**

| Setting                                     | Default               | Description                                                                              |
| ------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Alert Thresholds → CPU warning at           | 80%                   | CPU usage percentage that triggers a warning                                             |
| Alert Thresholds → Memory warning at        | 85%                   | Memory usage percentage that triggers a warning                                          |
| Alert Thresholds → Latency warning at       | 100 ms                | Mean TCP latency that triggers a warning                                                 |
| Alert Thresholds → Latency critical at      | 500 ms                | Mean TCP latency that triggers a critical alert                                          |
| Alert Thresholds → Graph history            | 60 min                | Number of minutes shown on the Overview resource graphs                                  |
| Config Editor → Create .bak backup on save  | On                    | Creates a `.bak` copy of each config file before overwriting                             |
| Discord Alerts → Enable Discord alerts      | On                    | Master switch — when off, no messages are sent                                           |
| Discord Alerts → Display name               | AzerothCore Dashboard | Name shown on Discord messages (overrides webhook default)                               |
| Discord Alerts → Avatar URL                 | *(dashboard icon)*    | Direct image URL used as the bot avatar; defaults to the dashboard icon hosted on GitHub |
| Discord Alerts → Server offline alert       | On                    | Posts to Discord when worldserver or authserver goes offline unexpectedly                |
| Discord Alerts → Server offline message     | *see below*           | Editable message body; supports `{server}`                                               |
| Discord Alerts → Server online alert        | On                    | Posts to Discord when worldserver or authserver comes back online                        |
| Discord Alerts → Server online message      | *see below*           | Editable message body; supports `{server}`                                               |
| Discord Alerts → Server stop alert          | On                    | Posts to Discord when worldserver or authserver is manually stopped                      |
| Discord Alerts → Server stop message        | *see below*           | Editable message body; supports `{server}`                                               |
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
| `BACKUP_PATH`                           | Where backup files are saved (scheduled and on-demand)   |
| `MYSQLDUMP_PATH`                        | Path to `mysqldump` executable                           |
| `PDUMP_OUTPUT_PATH`                     | Default directory for character dump exports             |
| `FRONTEND_URL`                          | Comma-separated CORS origins                             |
| `ALLOWED_IPS`                           | Comma-separated IPs allowed to reach the backend         |
| `IDLE_TIMEOUT_MINUTES`                  | Session idle timeout                                     |
| `AUDIT_LOG_RETENTION_DAYS`              | Audit log retention period                               |
| `DISCORD_WEBHOOK_URL`                   | Discord alert webhook URL                                |

## Audit Log *(Administrator only)*
- Paginated table (50 per page) of all dashboard actions, newest first
- **Success / Failed / All** tab filter — failed logins and blocked actions are highlighted in red
- **Action filter** — searchable multi-select dropdown to show only specific action types (e.g. `config.save`, `ban.account`); multiple actions can be selected simultaneously
- **Search** across username, IP, action, and details — filters server-side across all pages
- **Sortable columns** — ID, time, user, IP, action, status
- Colour-coded action badges by category: account changes (gold), bans (red), server ops (amber), console commands (red), config saves (amber), announcements/mail (green), channels (blue), reports (neutral)
- Config saves show a per-key diff: `WorldServerPort: "8085" → "8086"` so you can see exactly what changed
- Stored in the separate `acore_dashboard` database — unaffected by AzerothCore upgrades

## Analytics
- Historical analytics with canvas-rendered charts for three metric types: **Player Count**, **CPU Usage (%)**, and **Memory Usage (%)**
- Tab-style metric selector and date range presets (24h, 7d, 30d)
- Resolution selector: Raw, Hourly, or Daily aggregation
- Summary cards showing peak players (24h, 7d, 30d) and average CPU/memory over the last 24 hours
- Data stored in the `analytics_history` table in `acore_dashboard`, automatically populated by the backend
- Data point count and resolution displayed below the chart title

## Health Check *(Administrator only)*
- **Database Pools** — table showing each connection pool (auth, world, characters, dashboard) with status badge, latency in milliseconds, and connection counts (free, active, total)
- **System** — Node.js version, backend uptime, PID, platform, CPU core count, heap used/total, and RSS memory
- **Services** — server bridge connectivity status and agent status with uptime
- Optional auto-refresh checkbox (polls every 10 seconds)

## Sessions *(Administrator only)*
- Table of all active dashboard sessions with username, GM level, IP address, browser user-agent, login time, and last activity (relative time)
- Current session highlighted with a "You" badge; cannot revoke your own session
- **Revoke** — per-session button with confirmation modal; revoked users are logged out on their next request
- **Revoke All Others** — bulk revoke all sessions except your own with confirmation modal
- Session data stored in the `active_sessions` table in `acore_dashboard`

## Changelog
- Paginated table of all dashboard commits with commit hash (linked to GitHub), subject, author, and date
- Click any row to open a detail modal showing the full commit body and external link to GitHub
- Entries are parsed from the `changelog.md` file, updated automatically by CI on each merge

## Characters

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

## Name Filters
- Two tabs — **Profanity** and **Reserved** — each showing the entry count
- Add a new name (max 12 characters) with inline duplicate and length validation
- Filter the current list by typing; shows match count when filtering
- **Remove** any entry with confirmation modal (GM 2+)
- Actions are audit-logged

## Dashboard Management *(Administrator only)*
- **Restart Backend** — restarts the Express API server; frontend reconnects automatically within a few seconds
- **Restart Server Agent** — restarts the standalone agent process; includes prominent warning that game servers will be temporarily unmanaged (running servers are NOT stopped, but cannot be monitored or auto-restarted during the window)
- **Restart Frontend** — informs the user that the Vite dev server cannot be restarted remotely and must be restarted manually; production static builds do not require restarting
- All actions require a confirmation modal; all are audit-logged

## Mail Server
- Template list with ID, active status, subject, per-faction money, item count, condition count, and recipient count
- Create/Edit modal with four tabs: **General** (subject, body, Alliance/Horde money, active toggle), **Items** (per-faction item attachments), **Conditions** (eligibility rules: Level, PlayTime, Quest, Achievement, Reputation, Faction, Race, Class, AccountFlags), **Recipients** (characters who have already received the template — edit only)
- Items and conditions can be added before saving when creating a new template; they are batch-created alongside the template on save
- Delete with confirmation (cascades to items, conditions, and recipients)
