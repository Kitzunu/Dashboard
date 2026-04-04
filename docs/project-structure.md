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
│   │   ├── announcements.js       # Announce / notify broadcasts
│   │   ├── arena.js               # Arena team CRUD (list, detail, create, edit, delete, remove member)
│   │   ├── auditLogRoutes.js      # Audit Log read endpoint (Administrator)
│   │   ├── auth.js                # SRP6 login + rate limiting + logout
│   │   ├── autobroadcast.js       # Autobroadcast CRUD
│   │   ├── bans.js                # Ban management
│   │   ├── bugreports.js          # Bug report browser
│   │   ├── calendar.js            # Calendar event CRUD and game event / raid reset queries
│   │   ├── changelog.js           # Changelog parser (reads changelog.md)
│   │   ├── channels.js            # Chat channel browser and management
│   │   ├── characters.js          # Character search and detail (inventory, bank, reputation, currency)
│   │   ├── config.js              # Config file read/write with diff logging
│   │   ├── console.js             # GM command execution
│   │   ├── dashboardManage.js     # Dashboard process restart endpoints (backend, agent, frontend)
│   │   ├── db.js                  # Arbitrary SQL query endpoint
│   │   ├── dbc.js                 # Map/area name lookup endpoints
│   │   ├── envSettings.js         # .env file read/write for whitelisted keys (Administrator)
│   │   ├── guilds.js              # Guild list and detail (members, ranks, event log)
│   │   ├── lagreports.js          # Lag report browser
│   │   ├── mail.js                # Send in-game mail/items/money
│   │   ├── mailserver.js          # Mail server template CRUD
│   │   ├── mutes.js               # Mute management
│   │   ├── namefilters.js         # profanity_name and reserved_name CRUD
│   │   ├── overview.js            # Dashboard summary endpoint
│   │   ├── pdump.js               # Character dump export (write) and import (load) with full GUID remapping
│   │   ├── players.js             # Online players, kick, ban
│   │   ├── scheduledTasks.js      # Scheduled task CRUD and run-now trigger
│   │   ├── servers.js             # Server start/stop/status/logs
│   │   ├── servertools.js         # Scheduled restart, MOTD
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
│   └── server.js                  # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AccountsPage.jsx
│       │   ├── AlertsPage.jsx
│       │   ├── AnnouncePage.jsx
│       │   ├── ArenaPage.jsx
│       │   ├── AuditLogPage.jsx
│       │   ├── AutobroadcastPage.jsx
│       │   ├── BansPage.jsx
│       │   ├── BugReportsPage.jsx
│       │   ├── CalendarPage.jsx
│       │   ├── ChangelogPage.jsx
│       │   ├── ChannelsPage.jsx
│       │   ├── CharacterPage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── DashboardManagePage.jsx
│       │   ├── GuildsPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── LagReportsPage.jsx
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── MailPage.jsx
│       │   ├── MailServerPage.jsx
│       │   ├── MutesPage.jsx
│       │   ├── NameFiltersPage.jsx
│       │   ├── PlayersPage.jsx
│       │   ├── ScheduledTasksPage.jsx
│       │   ├── ServersPage.jsx
│       │   ├── SettingsPage.jsx
│       │   ├── SpamReportsPage.jsx
│       │   └── TicketsPage.jsx
│       ├── ansi.js                # ANSI SGR colour parser
│       ├── api.js                 # Fetch wrapper with JWT auth and 401 handling
│       ├── App.jsx                # Auth context and page routing
│       ├── constants.js           # Shared constants (races, classes, GM labels)
│       ├── socket.js              # Socket.IO client
│       └── toast.js               # Global toast notification helper
├── sql/
│   └── acore_dashboard.sql        # One-time setup: creates acore_dashboard DB, grants access, creates audit_logs table
├── .env.example
└── package.json                   # Root scripts (start, install:all)
```
