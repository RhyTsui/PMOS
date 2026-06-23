const fs = require('fs');
const path = require('path');
const { execFileSync, execSync, spawn } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const nextDir = path.join(appRoot, '.next');
const tsxCmd = path.join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function hasArg(name) {
  return process.argv.includes(name);
}

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

const port = String(argValue('--port', process.env.PORT || '8002'));
const host = String(argValue('--host', process.env.HOST || '0.0.0.0'));
const shouldClean = hasArg('--clean');
const shouldStop = hasArg('--stop');
const shouldKillPort = shouldStop || shouldClean || hasArg('--kill-port');
const bundler = hasArg('--turbopack') ? 'turbopack' : 'webpack';

function listeningPids(targetPort) {
  if (process.platform !== 'win32') return [];
  const output = execSync('netstat -ano', { encoding: 'utf8' });
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes(`:${targetPort}`) || !/\bLISTENING\b/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid) && pid !== String(process.pid)) pids.add(pid);
  }
  return Array.from(pids);
}

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    process.kill(Number(pid), 'SIGTERM');
  }
}

function stopPort(targetPort) {
  const pids = listeningPids(targetPort);
  for (const pid of pids) {
    console.log(`[dev-server] stopping listener pid ${pid} on port ${targetPort}`);
    try {
      killProcessTree(pid);
    } catch (error) {
      console.warn(`[dev-server] failed to stop pid ${pid}: ${error.message}`);
    }
  }
}

function cleanNextCache() {
  if (!fs.existsSync(nextDir)) return;
  console.log(`[dev-server] removing ${nextDir}`);
  fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}

if (shouldKillPort) stopPort(port);

if (shouldStop) {
  console.log(`[dev-server] port ${port} stopped`);
  process.exit(0);
}

if (listeningPids(port).length > 0) {
  console.error(`[dev-server] port ${port} is already in use. Run npm run dev:stop first, or use -- --kill-port.`);
  process.exit(1);
}

if (shouldClean) cleanNextCache();

const env = {
  ...process.env,
  NODE_ENV: 'development',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--enable-source-maps',
  HOST: host,
  HOSTNAME: host,
  PORT: port,
  NEXT_DEV_BUNDLER: bundler,
};

if (bundler === 'webpack') {
  env.NEXT_DISABLE_TURBOPACK = env.NEXT_DISABLE_TURBOPACK || '1';
}

console.log(`[dev-server] starting ${bundler} dev server at http://${host}:${port}`);

const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : tsxCmd;
const spawnArgs = process.platform === 'win32'
  ? ['/d', '/c', tsxCmd, 'src/server.ts']
  : ['src/server.ts'];

const child = spawn(spawnCommand, spawnArgs, {
  cwd: appRoot,
  env,
  stdio: 'inherit',
  shell: false,
});

function shutdown(signal) {
  if (child.pid) {
    try {
      killProcessTree(child.pid);
    } catch {}
  }
  if (signal) process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => shutdown());

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code || 0);
});
