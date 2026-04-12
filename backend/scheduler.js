/**
 * Scheduled task runner — checks every minute whether any enabled tasks
 * are due to fire, then executes them (restart or mysqldump backup).
 */

const path    = require('path');
const fs      = require('fs');
const { execFile } = require('child_process');
const { dashPool, getAllRealmDbNames } = require('./db');
const processManager = require('./processManager');
const log = require('./logger')('scheduler');

let intervalId    = null;
let lastFiredKey  = null; // "HH:MM" of the last minute tasks were checked

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function nowKey() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function setStatus(id, status) {
  await dashPool.query(
    'UPDATE scheduled_tasks SET last_run = NOW(), last_status = ? WHERE id = ?',
    [status.slice(0, 255), id]
  );
}

// ── Task runners ──────────────────────────────────────────────────────────────

async function runRestart(task) {
  const config  = task.config || {};
  const servers = config.servers || ['worldserver'];
  const delay   = parseInt(config.delay, 10) || 60;

  for (const server of servers) {
    // Ensure auto-restart is on so the server comes back up after shutdown
    await processManager.setAutoRestart(server, true);
    await processManager.stopServer(server, 'shutdown', delay);
  }
  return 'OK';
}

async function runBackup(task) {
  const config    = task.config || {};
  const databases = config.databases && config.databases.length
    ? config.databases
    : getAllRealmDbNames();

  const backupDir = process.env.BACKUP_PATH || path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const bin  = process.env.MYSQLDUMP_PATH || 'mysqldump';
  const host = process.env.DB_HOST     || '127.0.0.1';
  const port = process.env.DB_PORT     || '3306';
  const user = process.env.DB_USER     || 'acore';
  const pass = process.env.DB_PASSWORD || '';

  const now  = new Date();
  const ts   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

  const errors = [];
  for (const db of databases) {
    const outPath = path.join(backupDir, `${db}_${ts}.sql`);
    const args    = [
      `--host=${host}`, `--port=${port}`, `--user=${user}`,
      '--single-transaction', '--routines', '--triggers',
      '--skip-tz-utc', '--extended-insert', db,
    ];

    await new Promise((resolve) => {
      const proc = execFile(bin, args, {
        env: { ...process.env, MYSQL_PWD: pass },
        maxBuffer: 512 * 1024 * 1024,
      }, (err) => {
        if (err) { errors.push(`${db}: ${err.message}`); resolve(); }
      });

      const out = fs.createWriteStream(outPath);
      proc.stdout.pipe(out);
      out.on('finish', resolve);
      out.on('error', (e) => { errors.push(`${db} write: ${e.message}`); resolve(); });
    });
  }

  if (errors.length) return `Errors: ${errors.join('; ')}`;
  return `OK — ${databases.length} database(s) backed up to ${backupDir}`;
}

// ── Core tick ─────────────────────────────────────────────────────────────────

async function tick() {
  const key = nowKey();
  if (key === lastFiredKey) return;   // already checked this minute
  lastFiredKey = key;

  let tasks;
  try {
    [tasks] = await dashPool.query('SELECT * FROM scheduled_tasks WHERE enabled = 1');
  } catch {
    return; // DB not ready yet
  }

  const now     = new Date();
  const curHour = now.getHours();
  const curMin  = now.getMinutes();
  const curDay  = now.getDay(); // 0=Sun … 6=Sat

  for (const task of tasks) {
    if (task.hour !== curHour || task.minute !== curMin) continue;

    const days = String(task.days).split(',').map(Number);
    if (!days.includes(curDay)) continue;

    log.info(`Running "${task.name}" (${task.type})`);
    try {
      let status;
      if      (task.type === 'restart') status = await runRestart(task);
      else if (task.type === 'backup')  status = await runBackup(task);
      else                              status = 'Unknown type';
      await setStatus(task.id, status);
    } catch (err) {
      await setStatus(task.id, `Error: ${err.message}`).catch(() => {});
      log.error(`Task "${task.name}" failed:`, err.message);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Run a specific task immediately by ID (used by "Run Now" API endpoint). */
async function runNow(id) {
  const [[task]] = await dashPool.query('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
  if (!task) throw new Error('Task not found');

  let status;
  if      (task.type === 'restart') status = await runRestart(task);
  else if (task.type === 'backup')  status = await runBackup(task);
  else                              status = 'Unknown type';

  await setStatus(task.id, status);
  return status;
}

/** Start the scheduler (call once from server.js after DB is ready). */
function init() {
  if (intervalId) return;
  // Auto-create table in case the user hasn't run the SQL file
  dashPool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      name        VARCHAR(100)  NOT NULL,
      type        ENUM('restart','backup') NOT NULL,
      hour        TINYINT UNSIGNED NOT NULL DEFAULT 3,
      minute      TINYINT UNSIGNED NOT NULL DEFAULT 0,
      days        VARCHAR(20)   NOT NULL DEFAULT '0,1,2,3,4,5,6',
      enabled     TINYINT(1)    NOT NULL DEFAULT 1,
      config      JSON          NULL,
      last_run    DATETIME      NULL,
      last_status VARCHAR(255)  NULL,
      created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});

  intervalId = setInterval(tick, 60 * 1000);
  // Align to the next whole minute so ticks fire at :00 seconds
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
  setTimeout(() => { tick(); }, msToNextMinute);

  log.info('Started');
}

module.exports = { init, runNow };
