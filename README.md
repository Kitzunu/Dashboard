# AzerothCore Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage players, stream live console output, handle GM tickets, edit config files, and more — all from your browser.

See [docs/features.md](docs/features.md) for the full feature list, or jump straight to [Installation](#installation).

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A running AzerothCore MySQL instance (`acore_auth`, `acore_world`, `acore_characters`)
- A database user with read/write access to those three databases, plus the `acore_dashboard` database (see [Audit Log setup](docs/audit-log.md))
- Optional: a WotLK 3.3.5a client `DBFilesClient` folder for human-readable map/zone/race/class names (see [Configuration → DBC Files](docs/configuration.md#dbc-files-optional))

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

**6. Grant yourself admin access**

By default, AzerothCore accounts have GM level 0 and will only see the Moderator view. To see all pages including server controls, audit log, and settings, grant yourself GM level 3:

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```

See [Access Levels](docs/access-levels.md) for the full role breakdown.

### Launcher App (optional)

Instead of using the terminal, you can use the desktop launcher GUI to manage all services:

```bash
npm run launcher
```

This opens an Electron app with:
- Per-service Start / Stop / Restart controls for dashboard services
- Game server management (start/stop authserver and worldservers via the Server Agent)
- Real-time log output for all services and game servers
- Start All / Stop All buttons
- Open Dashboard shortcut (opens the browser)
- Settings for auto-start and minimize-to-tray

See [docs/launcher.md](docs/launcher.md) for details.

## Documentation

| Topic | Link | Description |
| --- | --- | --- |
| Features | [docs/features.md](docs/features.md) | Full feature overview |
| Pages | [docs/pages.md](docs/pages.md) | Detailed page-by-page documentation |
| Configuration | [docs/configuration.md](docs/configuration.md) | All `.env` options |
| Multi-Realm | [docs/multi-realm.md](docs/multi-realm.md) | Multi-realm setup and realm-aware features |
| Access Levels | [docs/access-levels.md](docs/access-levels.md) | Role-based access by GM level |
| Audit Log | [docs/audit-log.md](docs/audit-log.md) | Audit log setup and what is logged |
| Running | [docs/running.md](docs/running.md) | Starting and stopping the dashboard |
| Launcher | [docs/launcher.md](docs/launcher.md) | Electron desktop GUI for service management |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) | Common problems and fixes |
| Project Structure | [docs/project-structure.md](docs/project-structure.md) | Repository layout and architecture |
| Notes & Credits | [docs/notes.md](docs/notes.md) | Technical notes and credits |

## Contributing

Issues and pull requests are welcome at [github.com/Kitzunu/Dashboard](https://github.com/Kitzunu/Dashboard). When adding or changing a feature, please keep the README and the relevant file under `docs/` in sync.

## License

Released under the [MIT License](LICENSE).

## Credits

- **[AzerothCore](https://www.azerothcore.org/)** — the open-source World of Warcraft emulator this dashboard is built for
- **Development** — assisted by [Claude Code](https://claude.ai/code) (Anthropic)
