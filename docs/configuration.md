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

## Application

```env
# JWT secret — must be a strong random value
JWT_SECRET=change-this-to-a-random-secret

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

> Generate a strong `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

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
```

Backups are saved as `<database>_YYYY-MM-DD_HH-mm.sql` files.

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

| Alert              | Trigger                                                                | Cooldown           |
| ------------------ | ---------------------------------------------------------------------- | ------------------ |
| Server offline     | worldserver or authserver transitions from running → offline           | 5 min per server   |
| Server online      | worldserver or authserver transitions from offline → running           | 5 min per server   |
| Server stop        | worldserver or authserver is manually stopped from the dashboard       | 5 min per server   |
| Resource threshold | CPU or memory usage exceeds the configured threshold                   | 5 min per resource |
| Agent disconnect   | Server agent loses its SSE connection to the dashboard                 | 5 min              |
| Latency threshold  | Mean TCP latency to worldserver exceeds the warn or critical threshold | 5 min per level    |

Use the **Send Test Message** button in Settings to verify the webhook is working.

> Create a Discord webhook via **Channel Settings → Integrations → Webhooks → New Webhook**, then copy the URL.

## Session Idle Timeout

```env
# Auto-logout after this many minutes of inactivity (default: disabled).
# Set to 0 or leave blank to disable.
# IDLE_TIMEOUT_MINUTES=30
```

When set, a 60-second warning modal appears before the session expires. Any mouse movement, click, key press, or scroll resets the timer. The value is sent to the frontend at login so no Vite rebuild is needed after changing it.

## Audit Log Retention

```env
# Delete audit log entries older than this many days.
# Set to 0 or leave blank (default) to keep logs forever.
# AUDIT_LOG_RETENTION_DAYS=90
```

When set, the backend runs a purge on startup and then once every 24 hours, deleting rows from `audit_logs` whose `created_at` is older than the configured number of days.

## DBC Files (Optional)

```env
# Path to the WotLK 3.3.5a client DBFilesClient folder.
# Required for human-readable map, zone, race, and class names in Players and Accounts.
# Without this, raw IDs are shown as fallback.
# DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient
```

Files used: `Map.dbc` (map names), `AreaTable.dbc` (zone/area names), `ChrRaces.dbc` (race names), and `ChrClasses.dbc` (class names).
