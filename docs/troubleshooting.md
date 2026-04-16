# Troubleshooting

Common problems and how to fix them. If you hit an issue not listed here, please [open an issue](https://github.com/Kitzunu/Dashboard/issues).

## Startup

### `JWT_SECRET must be set` on backend start
The backend refuses to start without a JWT secret — any unset value would allow forged tokens. Generate one and put it in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `AGENT_SECRET must be set` on agent start
Same as above for the server agent. The agent will refuse to start if the secret is blank.

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### `EADDRINUSE` / port already in use
Something else is already listening on port `3001` (backend), `3002` (agent), or `5173` (Vite). Either stop the conflicting process or change the port:
- Backend — `PORT=3001` in `.env`
- Agent — `AGENT_PORT=3002` in `.env`
- Frontend — edit `frontend/vite.config.js`

### Frontend never starts when using `npm start`
`npm start` waits on `http://localhost:3001/api/health` before launching Vite. If the backend failed, the frontend will never start. Check the backend output for the underlying error (most commonly a missing `JWT_SECRET`, a DB connection failure, or a port conflict).

## Database

### `ER_ACCESS_DENIED_ERROR` / cannot connect
- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
- Confirm the user can reach the host — `mysql -h <host> -u <user> -p`
- If MySQL is bound to `127.0.0.1` only, the dashboard and MySQL must be on the same machine

### `Unknown database 'acore_dashboard'`
The dashboard database has not been created. Either run the SQL file once:

```bash
mysql -u root -p < sql/acore_dashboard.sql
```

Or grant your configured DB user `CREATE DATABASE` privilege and restart the backend — it will auto-create the schema.

### `audit_logs` / `active_sessions` tables missing
These are created automatically on first startup. If they are missing, the user likely lacks `CREATE TABLE` on `acore_dashboard`. Run `sql/acore_dashboard.sql` as a privileged user.

## Login

### Login always fails with "invalid credentials"
- Make sure you are using an **AzerothCore account** username and password, not your OS login
- AzerothCore uses SRP6 — the dashboard does not compare plaintext, so you must log in with the same password your game client uses
- Failed logins are written to the audit log with a reason — check the **Audit Log** page (requires Administrator) or `acore_dashboard.audit_logs`

### Login rate-limited
Login is capped at 10 attempts per 15 minutes per IP. Wait or reach from a different IP.

### Logged in but only see a handful of pages
You are signed in at GM level 0 or 1. Most server-management pages require GM level 2 or 3. Grant yourself Administrator:

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```

Then log out and log back in. See [Access Levels](access-levels.md).

### Session expires every few minutes
The idle timeout is controlled by `IDLE_TIMEOUT_MINUTES` in `.env`. Set it to `0` (or remove the line) to disable the timeout, or raise the value. The JWT itself expires after 8 hours regardless.

## Server Agent & Game Servers

### "Agent disconnected" banner / agent status red
The server agent process (`backend/serverAgent.js`) is not running or the backend cannot reach it.
- Confirm the agent is running — look for the `[server-agent]` process in your terminal, or start it with `npm run start:server-agent`
- Verify `AGENT_PORT` and `AGENT_SECRET` match between the backend and the agent (both read from the same `.env`)
- Restart the backend from **Dashboard Management** or with `npm run start:backend`

### Game servers keep crashing on restart
- Check **Servers → Auto-restart** is enabled if you want unexpected crashes to auto-recover
- Auto-restart does not trigger on manual stops from the dashboard — only on unexpected exits
- Look at the Console page for the crash output, or the worldserver log file for details

### Can't start worldserver — "path not found"
Verify `WORLDSERVER_PATH` in `.env` (or `path` in `worldservers.json`) points to the actual `worldserver.exe`/`worldserver` binary. The working directory defaults to the exe's directory but can be overridden with `WORLDSERVER_DIR` / the `dir` field in `worldservers.json`.

## Configuration

### Multiple worldservers not showing up
- `worldservers.json` must be in the project root (same folder as `package.json`)
- Restart both the backend **and** the server agent after editing — the file is read at startup
- Each entry needs a unique `id`
- See [Configuration → Multiple Worldservers](configuration.md#multiple-worldservers)

### Config Editor shows only worldserver.conf / authserver.conf
Set `CONFIG_PATH` in `.env` to the folder containing your module `.conf` files. Without it, the editor only reads the two main files from the server's exe directory.

## Visuals & Data

### Races/classes/zones show as raw IDs
You have not set `DBC_PATH`. Point it at your WotLK 3.3.5a client's `DBFilesClient` folder to enable human-readable names:

```env
DBC_PATH=C:\World of Warcraft\Data\enUS\DBFilesClient
```

Restart the backend after setting it. See [Configuration → DBC Files](configuration.md#dbc-files-optional) for the full list of files used.

### WoWHead tooltips don't load
WoWHead's tooltip script is loaded asynchronously from an external CDN. If you see item names but no hover tooltips, check your browser's network tab for a blocked request to `wowhead.com` — common causes are ad-blockers or offline use.

## Backups

### `mysqldump: command not found` on backup
`mysqldump` is not on your system `PATH`. Either add it to `PATH` or set `MYSQLDUMP_PATH` in `.env`:

```env
MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
```

Set `MYSQL_PATH` the same way if the **Restore** button fails for the same reason.

### Backups save but Restore fails
The `mysql` client binary is required for restores — it is separate from `mysqldump`. Set `MYSQL_PATH` if needed (see above).

## Discord Alerts

### Test message works but real alerts never fire
- Open **Settings → Discord Alerts** and verify both the master toggle and the per-event toggles are on
- Resource, latency, and agent-disconnect alerts respect the cooldown — during the cooldown window, repeat alerts are suppressed
- Event-driven alerts (server offline/online/stop) fire once per state change; if the server never actually changed state, no alert is sent

## LAN / Remote Access

### Other devices on my network can't connect
- Open the firewall for the dashboard's ports (3001, 5173) on the server machine
- Connect using the server's LAN IP, not `localhost` — e.g. `http://192.168.1.100:5173`
- If `ALLOWED_IPS` is set in `.env`, add the client IP to the list, or remove `ALLOWED_IPS` entirely to accept all private/LAN IPs (the default)

### CORS error in browser console
Add the origin to `FRONTEND_URL` (comma-separated) in `.env`:

```env
FRONTEND_URL=https://dashboard.example.com,http://my-other-host:5173
```

Private/LAN origins are always accepted regardless of this setting.

## Still stuck?

- Check the **Audit Log** page (Administrator) — many errors are logged there with the full reason
- Check the **Health Check** page (Administrator) — verifies every DB pool and the server agent connection
- Backend logs in the terminal include component tags like `[auth]`, `[db]`, `[agent]` to narrow down the source
- Open an issue at [github.com/Kitzunu/Dashboard](https://github.com/Kitzunu/Dashboard/issues)
