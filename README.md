# AzerothCore Dashboard

A web-based management dashboard for [AzerothCore](https://www.azerothcore.org/) servers. Monitor server status, manage online players, view console output, query databases, and manage account bans — all from your browser.

## Features

- **Console** — Real-time worldserver and authserver log output with GM command input
- **Players** — Live online player list with kick and ban actions, auto-refreshes every 30 seconds
- **Bans** — View and remove active account bans
- **Servers** — Start and stop worldserver / authserver as child processes
- **DB Query** — Run preset queries against the auth, world, and characters databases
- **Role-based access** — GM level controls what each user can see and do

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A running AzerothCore MySQL instance (`acore_auth`, `acore_world`, `acore_characters`)
- A database user with read/write access to those three databases

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-username/azerothcore-dashboard.git
cd azerothcore-dashboard
```

**2. Install all dependencies**

```bash
npm run install:all
```

This installs the root, backend, and frontend packages in one step.

**3. Configure environment**

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Open `.env` and set the following values:

```env
# Paths to your AzerothCore executables
WORLDSERVER_PATH=C:\AzerothCore\worldserver.exe
AUTHSERVER_PATH=C:\AzerothCore\authserver.exe

# Database connection
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=acore
DB_PASSWORD=acore
AUTH_DB=acore_auth
WORLD_DB=acore_world
CHARACTERS_DB=acore_characters

# JWT secret — must be changed to a long random string
JWT_SECRET=change-this-to-a-random-secret

# Backend port and frontend URL (for CORS)
PORT=3001
FRONTEND_URL=http://localhost:5173
```

> **Important:** Generate a strong `JWT_SECRET`. You can use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to create one.

**4. Set up a dashboard account**

The dashboard authenticates against the AzerothCore `account` table. Log in using any existing game account that has a GM level assigned in `account_access`.

| GM Level | Role          | Access                                      |
|----------|---------------|---------------------------------------------|
| 1        | Moderator     | Console (read), Players list                |
| 2        | Game Master   | + Kick/ban players, view/remove bans        |
| 3        | Administrator | + Start/stop servers, DB Query              |

To grant a GM level, run this in your auth database:

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```

## Running

Start both the backend and frontend together:

```bash
npm start
```

Or run them separately:

```bash
# Backend only (port 3001 by default)
npm run start:backend

# Frontend only (port 5173 by default)
npm run start:frontend
```

Then open [http://localhost:5173](http://localhost:5173) in your browser and log in with your AzerothCore account credentials.

## Project Structure

```
azerothcore-dashboard/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT verification, GM level guards
│   ├── routes/
│   │   ├── auth.js          # Login endpoint (SRP6 verification)
│   │   ├── bans.js          # List and remove account bans
│   │   ├── console.js       # GM command execution
│   │   ├── db.js            # Database query endpoint
│   │   ├── players.js       # Online players, kick, ban, count
│   │   └── servers.js       # Start, stop, status, logs
│   ├── db.js                # MySQL connection pools
│   ├── processManager.js    # Server process lifecycle
│   └── server.js            # Express + Socket.IO entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── BansPage.jsx
│       │   ├── ConsolePage.jsx
│       │   ├── DBQueryPage.jsx
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── PlayersPage.jsx
│       │   └── ServersPage.jsx
│       ├── api.js            # Fetch wrapper with JWT auth
│       ├── App.jsx           # Auth context and routing
│       ├── socket.js         # Socket.IO client
│       └── toast.js          # Toast notification helper
├── .env.example
└── package.json             # Root scripts (start, install:all)
```

## Notes

- The dashboard starts `worldserver.exe` and `authserver.exe` as **child processes**. If the dashboard process exits, both game servers will also stop.
- Worldserver shutdown uses the `server shutdown 0` command for a clean shutdown. Authserver is killed directly.
- Console command history persists for the current browser session. Auto-scroll preference is saved across sessions.
- The session token expires after 8 hours and will automatically redirect to the login page.
