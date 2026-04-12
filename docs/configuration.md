# Configuration

All configuration is done via the `.env` file in the project root.

## Server Paths

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

## Multiple Worldservers

To manage multiple worldserver instances (e.g. multiple realms), create a `worldservers.json` file in the project root. See `worldservers.json.example` for the format.

When `worldservers.json` is present, the `WORLDSERVER_*` environment variables above are ignored — all worldserver settings come from the JSON file instead. The auth server remains configured via `AUTHSERVER_PATH`.

```json
[
  {
    "id": "worldserver",
    "name": "Main Realm",
    "path": "C:\\AzerothCore\\worldserver.exe",
    "dir": "",
    "host": "127.0.0.1",
    "port": 8085,
    "characterDb": "acore_characters",
    "worldDb": "acore_world"
  },
  {
    "id": "worldserver-2",
    "name": "Second Realm",
    "path": "C:\\AzerothCore-2\\worldserver.exe",
    "dir": "",
    "host": "127.0.0.1",
    "port": 8086,
    "characterDb": "acore_characters_2",
    "worldDb": "acore_world_2"
  }
]
```

| Field          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `id`           | Unique slug used in API routes and Socket.IO rooms (required)            |
| `name`         | Human-readable display name shown in the UI                              |
| `path`         | Absolute path to the worldserver executable                              |
| `dir`          | Working directory (defaults to the exe's directory if empty)             |
| `host`         | Hostname for TCP latency measurement (default: `127.0.0.1`)             |
| `port`         | Game port for TCP latency measurement (default: `8085`)                  |
| `characterDb`  | Name of the characters database (default: `CHARACTERS_DB` or `acore_characters`) |
| `worldDb`      | Name of the world database (default: `WORLD_DB` or `acore_world`)       |

When `worldservers.json` is absent, the dashboard falls back to the `.env` variables for a single worldserver — no changes needed for existing single-server setups.

With multiple worldservers configured:
- The **Overview** page shows a status card for each worldserver
- The **Console** page shows a log panel per worldserver, each with its own command input
- The **Servers** page shows start/stop/auto-restart cards for each worldserver
- TCP latency is monitored independently per worldserver
- Discord alerts include the worldserver display name

## Config Files

```env
# Directory containing .conf files (optional).
# When set, all .conf files in this directory are loaded in the Config page —
# worldserver.conf and authserver.conf appear first, then module configs alphabetically.
# Without this, worldserver.conf and authserver.conf are read from the exe directory.
# CONFIG_PATH=C:\AzerothCore\configs
```

## Database

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

## Server Agent

```env
# Server agent port — the standalone process that keeps game servers running
# independently of the dashboard backend. Change if 3002 is already in use.
AGENT_PORT=3002

# Shared secret between the dashboard backend and the server agent.
# Must be set to a random string — leaving it blank will prevent the agent from starting.
# Generate: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
AGENT_SECRET=
```

## Application

```env
# JWT secret — required. Must be set to a long random string before use.
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=

# Backend port (default: 3001)
PORT=3001

# Comma-separated IPs allowed to reach the backend.
# When not set, all private/LAN IPs are accepted by default so that
# mobile devices and other machines on the same network can connect
# without extra configuration.
# Set this to restrict access to specific IPs only.
# ALLOWED_IPS=127.0.0.1,::1,192.168.1.50

# Frontend URL for CORS — comma-separated origins.
# Private/LAN origins (10.x, 172.16-31.x, 192.168.x, localhost) are
# always accepted regardless of this setting so mobile and LAN devices
# work out of the box.  Set this for any additional public origins.
# FRONTEND_URL=http://localhost:5173
```

> Both `JWT_SECRET` and `AGENT_SECRET` are **required** — the backend will accept any JWT token if `JWT_SECRET` is not set, which is a critical security risk. Generate them before first use.

## LAN / Remote Access

By default the dashboard accepts connections from any private/LAN IP address and allows CORS requests from private-network origins. This means mobile devices and other machines on the same network can connect without any extra configuration — just open the dashboard using the server's LAN IP, e.g. `http://192.168.1.100:5173`.

The frontend automatically detects the host's protocol and address and connects the API and WebSocket back to the same host, so no `VITE_API_URL` override is needed for LAN access.

To **restrict** access to specific IPs only, set `ALLOWED_IPS`:
```env
ALLOWED_IPS=127.0.0.1,::1,192.168.1.50
```

To allow CORS from a public (non-LAN) origin, set `FRONTEND_URL`:
```env
FRONTEND_URL=https://dashboard.example.com
```

## Scheduled Tasks

```env
# Directory where mysqldump backup files are saved (created automatically).
# BACKUP_PATH=C:\AzerothCore\backups

# Full path to mysqldump — only needed if it is not in your system PATH.
# MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe

# Full path to the mysql client — only needed if it is not in your system PATH.
# Used by the Backups page "Restore" feature to import SQL backup files.
# MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
```

Backups are saved as `<database>_YYYY-MM-DD_HH-mm-ss.sql` files. They can be created on-demand from the Backups page or automatically via scheduled tasks.

The scheduler checks every minute and fires tasks whose time and day-of-week match. If `mysqldump` is on your system `PATH` you do not need to set `MYSQLDUMP_PATH`.

For scheduled restarts, the target server's Auto-Restart is automatically enabled before the shutdown command is sent so the server agent brings it back up after the countdown.

## Character Dumps (pdump)

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

## Discord Alerts

```env
# Discord channel webhook URL.
# When set, the dashboard posts alerts to this webhook for the events enabled in Settings.
# Leave blank (or omit) to disable all Discord notifications.
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
```

Six alert types are supported, each with an independent toggle in **Settings → Discord Alerts**:

| Alert              | Trigger                                                                | Cooldown              |
| ------------------ | ---------------------------------------------------------------------- | --------------------- |
| Server offline     | A worldserver or authserver transitions from running → offline         | None (event-driven)   |
| Server online      | A worldserver or authserver transitions from offline → running         | None (event-driven)   |
| Server stop        | A worldserver or authserver is manually stopped from the dashboard     | None (event-driven)   |
| Resource threshold | CPU or memory usage exceeds the configured threshold                   | Configurable (default 5 min) |
| Agent disconnect   | Server agent loses its SSE connection to the dashboard                 | Configurable (default 5 min) |
| Latency threshold  | Mean TCP latency to a worldserver exceeds the warn or critical threshold | Configurable (default 5 min) |

The **Alert cooldown** setting (in minutes) controls the minimum time between repeated alerts of the same type. Set to `0` to disable the cooldown. Event-driven alerts (server offline/online/stop) fire once per state change and are not affected by the cooldown.

Use the **Send Test Message** button in Settings to verify the webhook is working.

> Create a Discord webhook via **Channel Settings → Integrations → Webhooks → New Webhook**, then copy the URL.

## Session Idle Timeout

```env
# Auto-logout after this many minutes of inactivity.
# The .env.example ships with a 30-minute default.
# Set to 0 or leave blank to disable.
IDLE_TIMEOUT_MINUTES=30
```

When set, a 60-second warning modal appears before the session expires. Any mouse movement, click, key press, or scroll resets the timer. The value is sent to the frontend at login so no Vite rebuild is needed after changing it.

## Audit Log Retention

```env
# Delete audit log entries older than this many days.
# The .env.example ships with a 90-day default.
# Set to 0 or leave blank to keep logs forever.
AUDIT_LOG_RETENTION_DAYS=90
```

When set, the backend runs a purge on startup and then once every 24 hours, deleting rows from `audit_logs` whose `created_at` is older than the configured number of days.

## DBC Files (Optional)

```env
# Path to the WotLK 3.3.5a client DBFilesClient folder.
# Required for human-readable map, zone, race, and class names in Players and Accounts.
# Without this, raw IDs are shown as fallback.
# DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient
```

Files used: `Map.dbc` (map names), `AreaTable.dbc` (zone/area names), `ChrRaces.dbc` (race names), `ChrClasses.dbc` (class names), `Faction.dbc` (faction names for reputation), `Achievement.dbc` and `Achievement_Category.dbc` (achievement names and categories), `CharTitles.dbc` (character title names), `AuctionHouse.dbc` (auction house names and factions), `BattlemasterList.dbc` (battleground names), and `Spell.dbc` (spell names for auras/deserter debuffs).
