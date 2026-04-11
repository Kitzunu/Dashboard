/**
 * Backend runner — wraps server.js and restarts it when it exits with code 42.
 * Normal exits (0) and crashes (any other code) are passed through as-is.
 */
const { spawn } = require('child_process');
const path = require('path');
const log = require('./logger')('runner');

const RESTART_CODE = 42;

function start() {
  log.info('Starting backend...');
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code === RESTART_CODE) {
      log.info('Restart requested — restarting backend in 1s...');
      setTimeout(start, 1000);
    } else {
      process.exit(code ?? 0);
    }
  });
}

start();
