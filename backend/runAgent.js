/**
 * Server agent runner — wraps serverAgent.js and restarts it when it exits with code 42.
 * Normal exits (0) and crashes (any other code) are passed through as-is.
 */
const { spawn } = require('child_process');
const path = require('path');

const RESTART_CODE = 42;

function start() {
  console.log('[agent-runner] Starting server agent...');
  const child = spawn(process.execPath, [path.join(__dirname, 'serverAgent.js')], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code === RESTART_CODE) {
      console.log('[agent-runner] Restart requested — restarting server agent in 1s...');
      setTimeout(start, 1000);
    } else {
      process.exit(code ?? 0);
    }
  });
}

start();
