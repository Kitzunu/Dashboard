# Running

## Start everything

```bash
# Start agent, backend, and frontend together
npm start
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

`npm start` launches all three processes concurrently, but the frontend is gated on the backend's `/api/health` endpoint — Vite will not start until the backend HTTP server is accepting connections. This prevents the browser from hitting the API before CORS and routing are fully initialised.

## Start services individually

```bash
npm run start:server-agent  # Server agent on port 3002 (manages game servers)
npm run start:backend       # Express backend on port 3001
npm run start:frontend      # Waits for backend health check, then starts Vite on port 5173
```

Starting the agent first, then the backend, then the frontend mirrors the dependency order.

## Desktop launcher

For a GUI alternative see [Launcher](launcher.md) — an Electron app with per-service Start/Stop/Restart controls, live log viewer, system tray support, and optional auto-start. Run it with `npm run launcher`.

## Stopping

- Press `Ctrl+C` in the terminal running `npm start` — all three services shut down together
- Individual services started with their own `start:*` command can be stopped with `Ctrl+C` in their respective terminal
- Stopping the **backend** does **not** stop the game servers — those are owned by the server agent
- Stopping the **server agent** does not stop running game server processes either (it disowns them), but they will no longer be managed/monitored until the agent is brought back up

## Accessing from the LAN

By default the dashboard accepts connections from any private/LAN IP address. Open the dashboard on another machine using the server's LAN IP, e.g. `http://192.168.1.100:5173`. See [Configuration → LAN / Remote Access](configuration.md#lan--remote-access) for the firewall and CORS details.

## Architecture note

The **server agent** (`backend/serverAgent.js`) is a separate process that owns the worldserver and authserver child processes. Because it runs independently, restarting the dashboard backend does not kill the game servers. The dashboard backend reconnects to the agent automatically when it comes back up.

Both the backend and the server agent are wrapped by lightweight runner scripts (`run.js` and `runAgent.js`) that automatically restart their respective process when it exits with code 42. This is how the **Restart Backend** and **Restart Agent** buttons in Dashboard Management work.

## Troubleshooting

If a service won't start, see [Troubleshooting → Startup](troubleshooting.md#startup). The most common causes are a missing `JWT_SECRET`/`AGENT_SECRET` or a port conflict.
