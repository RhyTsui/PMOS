/**
 * Small CLI for scripts/second-round-test-service.cjs.
 */
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const baseUrl = new URL(process.env.SECOND_ROUND_SERVICE_URL || 'http://127.0.0.1:8787');
const args = process.argv.slice(2);
const command = args.shift() || 'status';
const repoRoot = path.resolve(__dirname, '..');

function hasFlag(name) {
  return args.includes(name);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForService() {
  let lastError = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return await request('GET', '/health');
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw lastError || new Error('service did not become ready');
}

function restartService() {
  const restartScript = path.join(repoRoot, 'scripts', 'restart-second-round-test-service.cjs');
  const output = execFileSync(process.execPath, [restartScript], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}
function argValue(name) {
  const index = args.indexOf(name);
  if (index < 0) return '';
  return args[index + 1] || '';
}

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: baseUrl.hostname,
      port: baseUrl.port,
      path: pathname,
      method,
      headers: payload ? {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      } : undefined,
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(text || '{}');
          if (res.statusCode >= 400) {
            const error = new Error(data.error || `HTTP ${res.statusCode}`);
            error.data = data;
            reject(error);
          } else {
            resolve(data);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  if (command === 'run') {
    let restarted = null;
    if (!hasFlag('--no-restart')) {
      restarted = restartService();
      await waitForService();
    }
    const body = {};
    if (argValue('--row')) body.excelRow = Number(argValue('--row'));
    if (argValue('--case')) body.caseId = argValue('--case');
    if (argValue('--prompt')) body.promptIncludes = argValue('--prompt');
    if (argValue('--scene')) body.sceneIncludes = argValue('--scene');
    if (argValue('--limit')) body.limit = Number(argValue('--limit'));
    const data = await request('POST', '/run', body);
    console.log(JSON.stringify({ restarted, job: data }, null, 2));
    return;
  }

  if (command === 'cases') {
    const q = encodeURIComponent(argValue('--q') || '');
    const data = await request('GET', `/cases${q ? `?q=${q}` : ''}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'status') {
    const data = await request('GET', '/status');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'health') {
    const data = await request('GET', '/health');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'check') {
    const data = await request('GET', '/self-check');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'reload-cases') {
    const data = await request('POST', '/reload-cases', {});
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(error.data ? JSON.stringify(error.data, null, 2) : error.message);
  process.exit(1);
});




