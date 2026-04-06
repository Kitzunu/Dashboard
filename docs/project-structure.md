# Project Structure

```
Dashboard/
├── backend/
│   ├── middleware/
│   │   ├── auth.js                # JWT verification and GM level guards
│   │   └── ipAllowlist.js         # IP allowlist enforcement
│   ├── routes/
│   │   ├── accounts.js            # Account management
│   │   ├── alertsRoutes.js        # System alerts list, batch delete, filter-scoped clear
│   │   ├── analytics.js           # Historical analytics data and summary endpoints
│   │   ├── announcements.js       # Announce / notify broadcasts
│   │   ├── arena.js               # Arena team CRUD (list, detail, create, edit, delete, remove member)
│   │   ├── auctionhouse.js       # Auction house listing browser, stats, and delete
│   │   ├── auditLogRoutes.js      # Audit Log read endpoint (Administrator)
│   │   ├── auth.js                # SRP6 login + rate limiting + logout
│   │   ├── autobroadcast.js       # Autobroadcast CRUD
│   │   ├── backups.js              # Backup browse, download, create (mysqldump), restore, delete
│   │   ├── bans.js                # Ban management
│   │   ├── batchOperations.js     # Batch kick, ban, mail, and GM level operations
│   │   ├── battleground.js       # Battleground match history, deserters, and stats
│   │   ├── bugreports.js          # Bug report browser
│   │   ├── calendar.js            # Calendar event CRUD and game event / raid reset queries
│   │   ├── changelog.js           # Changelog parser (reads changelog.md)
│   │   ├── channels.js            # Chat channel browser and management
│   │   ├── characters.js          # Character search and detail (inventory, bank, reputation, currency)
│   │   ├── characterTransfer.js   # Character transfer between accounts
│   │   ├── config.js              # Config file read/write with diff logging
│   │   ├── console.js             # GM command execution
│   │   ├── dashboardManage.js     # Dashboard process restart endpoints (backend, agent, frontend)
│   │   ├── db.js                  # Arbitrary SQL query endpoint
│   │   ├── dbc.js                 # Map/area name lookup endpoints
│   │   ├── envSettings.js         # .env file read/write for whitelisted keys (Administrator)
│   │   ├── guilds.js              # Guild list and detail (members, ranks, event log)
│   │   ├── healthcheck.js         # System health check (DB pools, connections, system info, services)
│   │   ├── lagreports.js          # Lag report browser
│   │   ├── mail.js                # Send in-game mail/items/money
│   │   ├── mailserver.js          # Mail server template CRUD
│   │   ├── mutes.js               # Mute management
│   │   ├── namefilters.js         # profanity_name and reserved_name CRUD
│   │   ├── notifications.js       # Notification bell feed and unread count
│   │   ├── overview.js            # Dashboard summary endpoint
│   │   ├── pdump.js               # Character dump export (write) and import (load) with full GUID remapping
│   │   ├── players.js             # Online players, kick, ban
│   │   ├── scheduledTasks.js      # Scheduled task CRUD and run-now trigger
│   │   ├── servers.js             # Server start/stop/status/logs
│   │   ├── servertools.js         # Scheduled restart, MOTD
│   │   ├── sessions.js            # Active session management (list, revoke, revoke all)
│   │   ├── settingsRoutes.js      # Dashboard settings read/write and Discord webhook test
│   │   ├── spamreports.js         # Spam report browser
│   │   ├── thresholds.js          # Alert threshold read/write
│   │   └── tickets.js             # GM ticket CRUD
│   ├── audit.js                   # Audit log helper (fire-and-forget write to acore_dashboard)
│   ├── alertLogger.js             # Writes system alerts to the dashboard DB alerts table
│   ├── dashboardSettings.js       # Dashboard settings persistence (acore_dashboard.settings)
│   ├── discord.js                 # Discord webhook sender (server offline/online/stop, thresholds, latency, agent disconnect)
│   ├── db.js                      # MySQL connection pools (auth, world, characters, dashboard)
│   ├── dbc.js                     # WotLK DBC binary parser
│   ├── latencyMonitor.js          # TCP latency sampling + rolling stats
│   ├── playerHistory.js           # Rolling player count history buffer
│   ├── resourceHistory.js         # Rolling CPU and memory history buffer
│   ├── run.js                     # Backend runner — restarts server.js on exit code 42
│   ├── runAgent.js                # Agent runner — restarts serverAgent.js on exit code 42
│   ├── scheduler.js               # Scheduled task runner (checks every minute)
│   ├── serverAgent.js             # Standalone server agent — owns game server processes
│   ├── serverBridge.js            # SSE bridge: forwards server agent events to frontend Socket.IO
│   ├── processManager.js          # Agent HTTP client (async proxy to serverAgent)
│   ├── thresholds.js              # Alert threshold persistence (reads/writes via dashboardSettings)
│   ├── worldservers.js            # Multi-worldserver config loader (worldservers.json or .env fallback)
│   └── server.js                  # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── context/
│       │   └── ServerContext.jsx      # Server state context (socket, serverStatus, worldservers, player/ticket counts)
│       ├── hooks/
│       │   └── useLocalStorage.js     # useState backed by localStorage with JSON serialization
│       ├── components/
│       │   ├── AccountsPage.jsx
│       │   ├── AlertsPage.jsx
│       │   ├── AnalyticsPage.jsx
│       │   ├── AnnouncePage.jsx
│       │   ├── ArenaPage.jsx
│       │   ├── AuctionHousePage.jsx
│       │   ├── AuditLogPage.jsx
│       │   ├── AutobroadcastPage.jsx
│       │   ├── BackupsPage.jsx
│       │   ├── BansPage.jsx
│       │   ├── BatchOperationsPage.jsx
│       │   ├── BattlegroundPage.jsx
│       │   ├── BugReportsPage.jsx
│       │   ├── CalendarPage.jsx
│       │   ├── ChangelogPage.jsx
│       │   ├── ChannelsPage.jsx
│       │   ├── CharacterPage.jsx
│       │   ├── CharacterTransferPage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── DashboardManagePage.jsx
│       │   ├── GuildsPage.jsx
│       │   ├── HealthCheckPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── LagReportsPage.jsx
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── MailPage.jsx
│       │   ├── MailServerPage.jsx
│       │   ├── MutesPage.jsx
│       │   ├── NameFiltersPage.jsx
│       │   ├── NotificationBell.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ScheduledTasksPage.jsx
│       │   ├── ServersPage.jsx
│       │   ├── SessionsPage.jsx
│       │   ├── SettingsPage.jsx
│       │   ├── SpamReportsPage.jsx
│       │   └── TicketsPage.jsx
│       ├── styles/
│       │   ├── base.css           # CSS custom properties (:root) and reset
│       │   ├── layout.css         # Sidebar, nav groups/badges, main content, page shell, responsive
│       │   ├── components/
│       │   │   ├── alerts.css     # .alert variants and .offline-notice
│       │   │   ├── badges.css     # All .badge colour variants
│       │   │   ├── buttons.css    # .btn and size/colour modifiers
│       │   │   ├── forms.css      # Inputs, .form-group, readonly, shared form helpers
│       │   │   ├── modals.css     # .modal-overlay, .modal shell, idle-warning, header/footer
│       │   │   ├── pagination.css # Pagination controls
│       │   │   ├── scrollbars.css # ::-webkit-scrollbar rules, kbd, code
│       │   │   ├── table.css      # .data-table, td helpers, .filter-row, .loading-text
│       │   │   └── toasts.css     # Toast container and animation
│       │   └── pages/
│       │       ├── accounts.css   # Account detail modal
│       │       ├── announce.css   # Announcements page
│       │       ├── arena.css      # Arena page
│       │       ├── auctionhouse.css # Auction House page
│       │       ├── auditlog.css   # Audit log and action multi-select
│       │       ├── bans.css       # Bans page
│       │       ├── calendar.css   # Calendar page
│       │       ├── channels.css   # Channels page
│       │       ├── characters.css # Character detail page
│       │       ├── config.css     # Config file editor
│       │       ├── console.css    # Console page
│       │       ├── dbquery.css    # DB Query page
│       │       ├── guilds.css     # Guilds page
│       │       ├── login.css      # Login page
│       │       ├── mail.css       # Mail compose and Mail Server pages
│       │       ├── notifications.css # Notification bell component
│       │       ├── overview.css   # Homepage/Overview, resource graphs, latency panel, thresholds
│       │       ├── reports.css    # Bug Reports and Lag Reports pages
│       │       ├── servers.css    # Servers page, server cards, restart tools, MOTD
│       │       ├── settings.css   # Settings page
│       │       ├── tickets.css    # Tickets page
│       │       └── transfer.css   # Character Transfer and Batch Operations
│       ├── ansi.js                # ANSI SGR colour parser
│       ├── api.js                 # Fetch wrapper with JWT auth and 401 handling
│       ├── App.jsx                # Auth context (useAuth), ServerProvider wrapper, and page routing
│       ├── constants.js           # Shared constants (races, classes, GM labels)
│       ├── index.css              # Entry point — @import chain for all style layers
│       ├── socket.js              # Socket.IO client (connect/disconnect/get)
│       └── toast.js               # Global toast notification helper
├── sql/
│   └── acore_dashboard.sql        # One-time setup: creates acore_dashboard DB, grants access, creates audit_logs table
├── .env.example
├── worldservers.json.example      # Template for multi-worldserver configuration
└── package.json                   # Root scripts (start, install:all)
```
