# Features

## Server

- **Overview** — Server status cards with live uptime timers, online player/ticket/ban counts, system memory and CPU bars with rolling 60-minute history graphs and configurable alert thresholds (threshold shown as dashed line on graph), browser notifications with audio cues, Discord webhook alerts, worldserver TCP latency stats (mean/median/P95/P99/max over a rolling 60-minute window) per worldserver, and a player count sparkline
- **Console** — Real-time log streaming via Socket.IO with full ANSI colour rendering, GM command input, persistent per-session command history, and auto-scroll toggle; one panel per configured worldserver plus authserver
- **Servers** — Start, stop, scheduled restart, auto-restart toggle, and MOTD editor; supports multiple worldservers via `worldservers.json` with per-server controls and target selection
- **Autobroadcast** — Manage the in-game autobroadcast rotation: add, edit, delete, and weight messages
- **Mail Server** — Full CRUD editor for the `mail_server_template` system with subject, body, per-faction money and items, eligibility conditions, and a recipients list
- **DB Query** — Run SQL queries against the auth, world, or characters databases
- **Scheduled Tasks** — Schedule recurring database backups and server restarts by time of day and day of week; run any task immediately with Run Now
- **Backups** — Browse, download, create, restore, and delete database backup files; create on-demand backups by selecting which databases to dump; restore any backup to its original database with confirmation; filter by database; file size and total summary
- **Config** — Edit worldserver.conf, authserver.conf, and any module `.conf` files directly in the browser with line numbers, a find bar, unsaved-change indicators, and automatic `.bak` backups

## Game

- **Tickets** — View, respond to, comment on, assign, escalate, and close GM tickets; sidebar badge shows open ticket count
- **Bans** — Three-tab view of active account, character, and IP bans; issue new bans and unban with confirmation
- **Mutes** — List of all active account mutes with expiry and time remaining; issue new mutes and unmute with confirmation
- **Announce** — Broadcast server-wide messages (chat announce or on-screen notify) with quick-fill templates and session history
- **Send Mail** — Send in-game mail, items (up to 12), or money (gold/silver/copper) to any character
- **Channels** — Browse all active chat channels; view banned players and channel config (rights, speak delay, messages); lock icon for password-protected channels; unban players (GM 2+); delete channel (Administrator)
- **Calendar** — Month-view calendar with custom events and notes, WoW game holidays, in-game player-created events, and weekly raid reset schedule; create, edit, and delete custom events (GM 2+); toggle event type visibility; day detail panel
- **Name Filters** — View, add, and remove entries in the `profanity_name` and `reserved_name` tables; tabbed interface with live filter and per-entry remove (GM 2+)
- **Batch Operations** — Perform bulk actions on multiple players or accounts: batch kick, batch ban (character/account/IP), batch mail, and batch GM level changes; inline search picker to find characters or accounts by name; results modal showing per-target success/failure

## Players

- **Players** — Live online player list with race, class, level, zone, and account; filter by name or account; kick with optional reason; ban by character, account, or IP
- **Accounts** — Search by username, email, or IP; view full account detail and characters; set GM level, expansion, email, lock/unlock, reset password, mute/unmute characters, create accounts, and delete accounts
- **Characters** — Search all characters by name; detail panel with eight tabs: Overview (money, honor/arena points, played time, currency), Stats (base stats, health/power, combat stats, resistances), Equipment (all 19 slots with WoWHead tooltips), Bags (backpack + 4 bag slots), Bank (main bank + 7 bank bag slots), Auras (active buffs/debuffs with duration), Reputation (all factions with standing label, progress bar, and at-war indicator), and Achievements (grouped by category with completion date). **Export Dump** — generate a `.pdump`-compatible SQL dump for any character (download to browser or save to a server path). **Import Dump** — load a dump file into any account with full GUID remapping compatible with the AzerothCore `.pdump load` command
- **Guilds** — Browse all guilds with leader, member count, and bank balance; detail panel with member roster (class, level, rank), rank list with bank gold per day, and event log (invites, joins, promotions, demotions, kicks, leaves); tabard colour preview
- **Arena Teams** — Browse all arena teams sorted by rating with captain, bracket type (2v2/3v3/5v5), and member count; search by name or captain; filter by bracket; detail panel with season/weekly stats, member roster with personal ratings, and match history (per-player MMR); create teams (GM 3+), edit rating/captain (GM 3+), delete teams (GM 3+), remove members (GM 2+)
- **Character Transfer** — Transfer characters between accounts; search characters by name, view GUID/race/class/level/online status; validate transfer eligibility (must be offline); search or enter target account; confirmation modal with audit logging

## Reports

- **Lag Reports** — Browse player-submitted lag events; filter by type and minimum latency; aggregate stats with top reporters and top maps; dismiss or clear all
- **Bug Reports** — Browse FeedbackUI bug reports, suggestions, and feedback; separated into Open/Closed tabs with type filter; assignee and comment fields; close/reopen per report
- **Spam Reports** — Browse in-game spam reports (mail, chat, calendar types); filter by type, search by spammer name; sortable columns; detail modal; delete individual reports (GM 2+) or clear all (Administrator)

## Dashboard

- **Alerts** — Persistent log of all system alerts stored in the `acore_dashboard` database: latency warning/critical threshold breaches, CPU/memory threshold breaches, server crash/online/stop transitions, and agent disconnects — each with severity badge, type, description, metadata (values and thresholds), and timestamp; filter by severity and type, view detail modal with raw metadata, checkbox batch delete, filter-scoped clear all *(visible to GM level 1+; delete/clear requires Administrator)*
- **Analytics** — Historical analytics with canvas-rendered charts for player count, CPU usage, and memory usage; configurable date range presets (24h, 7d, 30d); resolution modes (raw, hourly, daily); summary cards showing peak players and average CPU/memory over various windows
- **Audit Log** — Immutable record of all critical actions taken through the dashboard: logins (including failed attempts with reason), logouts, server start/stop/restart, config saves (with changed key→value diff), MOTD changes, bans/unbans, account changes, console commands, DB queries, announcements, mail sends, and more — with user, IP, timestamp, and success/failure status *(Administrator only)*
- **Health Check** — System health dashboard showing database pool status (per-pool latency, free/active/total connections), Node.js system info (version, uptime, PID, platform, CPU cores, heap/RSS memory), and service status (server bridge connectivity, agent status and uptime); optional auto-refresh every 10 seconds *(Administrator only)*
- **Sessions** — View all active dashboard sessions with username, GM level, IP, browser user-agent, login time, and last activity; revoke individual sessions or all sessions except your own; current session highlighted *(Administrator only)*
- **Settings** — Dashboard-wide configuration stored in the `acore_dashboard` database; settings changes are audit-logged; alert thresholds (CPU, memory, latency warning/critical, graph window); Discord alert toggles per event type. Also includes an **Environment (.env)** section for editing whitelisted `.env` keys directly from the UI (requires backend restart to apply) *(Administrator only)*
- **Dashboard Management** — Restart the backend, server agent, or frontend from the UI; each action requires confirmation; agent restart includes a clear warning that game servers will be temporarily unmanaged *(Administrator only)*
- **Changelog** — Paginated table of all dashboard commits with hash, subject, author, and date; click any entry to view the full commit body and link to GitHub

## Other

- **Notification Bell** — Header notification bell with unread count badge; dropdown panel showing recent system alerts with severity colouring and timestamps; marks notifications as read on open; links to the full Alerts page
- **IP Allowlist** — Backend access restricted to a configurable list of IPs; defaults to accepting all private/LAN addresses when `ALLOWED_IPS` is not set
- **CORS** — Private/LAN origins are always accepted; additional origins can be added via `FRONTEND_URL`
- **Mobile Responsive** — Collapsible sidebar with hamburger toggle, optimised layouts for tablet (≤ 768px) and phone (≤ 480px) screens
- **Role-based access** — GM level controls what each user can see and do
