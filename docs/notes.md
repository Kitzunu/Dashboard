# Notes

- Game servers are managed by the standalone **server agent** (`serverAgent.js`), not the dashboard backend. Restarting the backend does not stop the game servers — they keep running and the backend reconnects automatically.
- **Auto-restart** tracks intentional stops via a flag — it only restarts on unexpected crashes, not manual stops from the dashboard.
- **Authentication** uses AzerothCore's SRP6 verifier (salt + verifier columns) — no plain-text passwords are ever compared or stored.
- Login is rate-limited to 10 attempts per 15 minutes per IP.
- JWT session tokens expire after 8 hours; the frontend automatically redirects to the login page on expiry.
- **Idle timeout** — if `IDLE_TIMEOUT_MINUTES` is set, a warning modal counts down the last 60 seconds before auto-logout. User activity (mouse, keyboard, scroll) resets the timer.
- Console log buffers are capped at 2000 lines per server process.
- **Audit Log** writes are fire-and-forget — a failure to write an audit entry never blocks or errors the main operation. The `acore_dashboard` database is kept separate from the AzerothCore databases so it is never affected by core upgrades or migrations.

# Credits

- **[AzerothCore](https://www.azerothcore.org/)** — the open-source World of Warcraft emulator this dashboard is built for
- **Development** — assisted by [Claude Code](https://claude.ai/code) (Anthropic)
