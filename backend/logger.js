/**
 * Console logger with AzerothCore-style colored output.
 *
 * Color mapping mirrors the default worldserver.conf Appender.Console colors:
 *   FATAL  = RED        | ERROR = LRED (bright red)
 *   WARN   = BROWN      | INFO  = CYAN
 *   DEBUG  = MAGENTA    | TRACE = YELLOW
 *
 * Format:  YYYY-MM-DD HH:MM:SS LEVEL [component] message
 */

const RESET  = '\x1b[0m';

const Colors = {
  FATAL: '\x1b[31m',        // RED
  ERROR: '\x1b[91m',        // LRED (bright red)
  WARN:  '\x1b[33m',        // BROWN / YELLOW (closest ANSI match)
  INFO:  '\x1b[36m',        // CYAN
  DEBUG: '\x1b[35m',        // MAGENTA
  TRACE: '\x1b[93m',        // YELLOW (bright)
};

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function format(level, component, args) {
  const color = Colors[level] || '';
  const ts    = timestamp();
  const tag   = component ? ` [${component}]` : '';
  const msg   = args.map(a => (typeof a === 'string' ? a : (a instanceof Error ? a.stack || a.message : JSON.stringify(a)))).join(' ');
  return `${color}${ts} ${level.padEnd(5)}${tag} ${msg}${RESET}`;
}

/**
 * Create a scoped logger for a component.
 *
 *   const log = require('./logger')('scheduler');
 *   log.info('Started');            // 2026-04-11 14:30:45 INFO  [scheduler] Started
 *   log.error('Task failed:', err); // 2026-04-11 14:30:45 ERROR [scheduler] Task failed: ...
 *
 * Or use the bare logger without a component scope:
 *
 *   const log = require('./logger');
 *   log.info('server', 'Listening on port 3001');
 */
function createLogger(component) {
  return {
    fatal: (...args) => console.error(format('FATAL', component, args)),
    error: (...args) => console.error(format('ERROR', component, args)),
    warn:  (...args) => console.warn (format('WARN',  component, args)),
    info:  (...args) => console.log  (format('INFO',  component, args)),
    debug: (...args) => console.log  (format('DEBUG', component, args)),
    trace: (...args) => console.log  (format('TRACE', component, args)),
  };
}

// Allow both  require('./logger')('component')  and  require('./logger').info(...)
const defaultLogger = createLogger(null);
const exported = (component) => createLogger(component);
Object.assign(exported, defaultLogger);

module.exports = exported;
