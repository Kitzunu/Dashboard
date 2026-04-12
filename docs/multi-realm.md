# Multi-Realm Support

The dashboard supports multiple realms via `worldservers.json`. Each realm can have its own `characterDb` and `worldDb` databases. Single-realm setups work identically to before — no configuration changes needed.

See [Configuration — Multiple Worldservers](configuration.md#multiple-worldservers) for the `worldservers.json` format and field reference.

## How It Works

- **Backend middleware** (`backend/middleware/realmDb.js`) reads `?realmId=` from the query string and attaches the correct database pools (`req.charPool` / `req.worldPool`) to each request
- **Database pools** are lazily created and cached by database name — realms sharing a database share a pool
- **Frontend** uses `RealmSelector` for database-scoped pages and `ServerSelector` for process-targeted commands

## Realm-Aware Features

**Database pages** (use `RealmSelector` — switches which character/world DB is queried):
- Players, Tickets, Characters, Guilds, Arena, Battlegrounds, Auction House
- Bans (character bans), Calendar Events, DB Query, Health Check
- Analytics (per-realm player count history), Character Transfer

**Command pages** (use `ServerSelector` — targets a specific worldserver process):
- Announcements, Mail, Mutes, Batch Operations

**Aggregate/cross-realm features:**
- **Home page** — shows total player count plus per-realm breakdown
- **Health Check** — `/api/healthcheck/all` endpoint checks all realm database pools
- **Analytics** — records per-realm player counts; filters by realm when selected
- **Backups** — create modal groups databases by realm with labels
- **Config Editor** — scans each realm's server directory for config files
- **Scheduled Tasks** — server checkboxes built dynamically from `worldservers.json`
- **Cross-realm Character Transfer** — uses pdump (dump from source realm, load into destination) with full GUID remapping; character is removed from source after successful transfer
