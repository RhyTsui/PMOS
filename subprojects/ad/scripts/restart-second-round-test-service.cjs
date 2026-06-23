/**
 * Restart the local second-round test service from the current workspace.
 *
 * This intentionally kills old service processes before starting a detached
 * fresh one, so test requests never hit stale wrapper code.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync, spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const serviceFile = path.join(repoRoot, 'scripts', 'second-round-test-service.cjs');
const pidFile = path.join(repoRoot, 'tmp', 'second-round-test-service.pid.json');
const outFile = path.join(repoRoot, 'tmp', 'second-round-test-service.out.log');
const errFile = path.join(repoRoot, 'tmp', 'second-round-test-service.err.log');

function ps(command) {
  return execFileSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    command,
  ], { encoding: 'utf8' });
}

function stopOldServices() {
  const escapedService = serviceFile.replace(/'/g, "''");
  const command = [
    `$service='${escapedService}'`,
    '$matches = Get-CimInstance Win32_Process | Where-Object {',
    "  $_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine -like ('*' + $service + '*')",
    '}',
    '$matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }',
    '$matches | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress',
  ].join('\n');
  const raw = ps(command).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function startService() {
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  const out = fs.openSync(outFile, 'a');
  const err = fs.openSync(errFile, 'a');
  const child = spawn(process.execPath, [serviceFile], {
    cwd: repoRoot,
    env: process.env,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

const stopped = stopOldServices();
const pid = startService();

fs.writeFileSync(pidFile, JSON.stringify({
  pid,
  startedAt: new Date().toISOString(),
  serviceFile,
  outFile,
  errFile,
  stopped,
}, null, 2));

console.log(JSON.stringify({
  ok: true,
  pid,
  serviceUrl: `http://${process.env.SECOND_ROUND_SERVICE_HOST || '127.0.0.1'}:${process.env.SECOND_ROUND_SERVICE_PORT || 8787}`,
  pidFile,
  outFile,
  errFile,
  stoppedCount: stopped.length,
}, null, 2));
