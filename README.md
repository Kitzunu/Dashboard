# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage players, stream live console output, handle GM tickets, edit config files, and more — all from your browser.

📖 **[Full Documentation](docs/index.md)**

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A running AzerothCore MySQL instance (`acore_auth`, `acore_world`, `acore_characters`)
- A database user with read/write access to those three databases, plus the `acore_dashboard` database (see [Audit Log setup](docs/audit-log.md))

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

Edit `.env` with your values — see the [Configuration](docs/configuration.md) docs for all options.

**4. Set up the dashboard database**

```bash
mysql -u root -p < sql/acore_dashboard.sql
```

This creates the `acore_dashboard` database used for audit logs, alerts, and settings. The dashboard can also auto-create it on first startup if your MySQL user has `CREATE DATABASE` privileges.

**5. Start the dashboard**

```bash
npm start
```

Then open [http://localhost:5173](http://localhost:5173) and log in with your AzerothCore account credentials.

## Quick Reference

| Topic | Link |
| --- | --- |
| Features | [docs/features.md](docs/features.md) |
| Configuration | [docs/configuration.md](docs/configuration.md) |
| Access Levels | [docs/access-levels.md](docs/access-levels.md) |
| Audit Log | [docs/audit-log.md](docs/audit-log.md) |
| Running | [docs/running.md](docs/running.md) |
| Pages | [docs/pages.md](docs/pages.md) |
| Project Structure | [docs/project-structure.md](docs/project-structure.md) |
| Notes & Credits | [docs/notes.md](docs/notes.md) |

## Architecture

The frontend uses React with two shared contexts:

- **`AuthContext`** (`src/App.jsx`) — user auth state (`token`, `username`, `gmlevel`). Consumed via `useAuth()`.
- **`ServerContext`** (`src/context/ServerContext.jsx`) — WebSocket connection, server running state, worldserver list, player/ticket counts. Consumed via `useSocket()` and `useServerStatus()`.

Shared hooks live in `src/hooks/`:
- **`useLocalStorage(key, default)`** — `useState` backed by `localStorage` with JSON serialization.

## Credits

- **[AzerothCore](https://www.azerothcore.org/)** — the open-source World of Warcraft emulator this dashboard is built for
- **Development** — assisted by [Claude Code](https://claude.ai/code) (Anthropic)
