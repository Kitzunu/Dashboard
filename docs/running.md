# Running

```bash
# Start agent, backend, and frontend together
npm start

# Or separately
npm run start:server-agent  # Server agent on port 3002 (manages game servers)
npm run start:backend       # Express backend on port 3001
npm run start:frontend      # Waits for backend health check, then starts Vite on port 5173
```

`npm start` launches all three processes concurrently but the frontend is gated on the backend's `/api/health` endpoint — Vite will not start until the backend HTTP server is accepting connections. This prevents the browser from hitting the API before CORS and routing are fully initialised.

The **server agent** (`serverAgent.js`) is a separate process that owns the worldserver and authserver child processes. Because it runs independently, restarting the dashboard backend does not kill the game servers. The dashboard backend reconnects to the agent automatically when it comes back up.

Both the backend and the server agent are wrapped by lightweight runner scripts (`run.js` and `runAgent.js`) that automatically restart their respective process when it exits with code 42. This is how the **Restart Backend** and **Restart Agent** buttons in Dashboard Management work.
