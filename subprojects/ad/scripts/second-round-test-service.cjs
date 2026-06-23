/**
 * Local wrapper service for scripts/run-second-round-tests.cjs.
 *
 * It keeps test defaults in one place so a caller can trigger a case without
 * rebuilding the runner command every time.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const XLSX = require('xlsx');

const repoRoot = path.resolve(__dirname, '..');
const runnerFile = path.join(repoRoot, 'scripts', 'run-second-round-tests.cjs');
const DEFAULT_BASE_URL = 'http://10.236.14.27:8002';
const inputFile = path.resolve(process.env.SECOND_ROUND_INPUT_FILE || path.join(repoRoot, 'docs', 'review', 'testcase-prompts-v1.1-renumbered.md'));
const pidFile = path.join(repoRoot, 'tmp', 'second-round-test-service.pid.json');

const PORT = Number(process.env.SECOND_ROUND_SERVICE_PORT || 8787);
const HOST = process.env.SECOND_ROUND_SERVICE_HOST || '127.0.0.1';
const DEFAULT_AUTH_FILE = path.join(repoRoot, 'frontend', 'src', '.auth', 'login-state.json');
const frontendDir = path.join(repoRoot, 'frontend', 'src');
const devOutFile = path.join(repoRoot, 'tmp', 'second-round-dev-server.out.log');
const devErrFile = path.join(repoRoot, 'tmp', 'second-round-dev-server.err.log');
const startedAt = new Date().toISOString();

let cases = loadCases();
let currentJob = null;
let lastJob = null;
let nextJobId = 1;

function decodeMarkdownCell(value) {
  return String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\\|/g, '|').trim();
}

function loadMarkdownCases(file) {
  const text = fs.readFileSync(file, 'utf8');
  const output = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|\s*-+\s*\|\s*-+\s*\|$/.test(trimmed)) continue;
    const cells = trimmed.slice(1, -1).split(/(?<!\\)\|/).map(decodeMarkdownCell);
    if (cells.length < 2 || cells[0] === '编号') continue;
    const id = cells[0];
    const prompt = cells[1];
    if (!id || !prompt) continue;
    output.push({
      excelRow: output.length + 2,
      id,
      scene: '',
      prompt,
      keyPoint: '',
      sourceType: 'markdown',
    });
  }
  return output;
}

function loadXlsxCases(file) {
  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const headers = rows[0];
  const col = {
    id: headers.indexOf('用例ID'),
    scene: headers.indexOf('测试场景'),
    prompt: headers.indexOf('测试输入Prompt'),
    keyPoint: headers.indexOf('关键点'),
  };

  return rows
    .slice(1)
    .map((row, index) => ({
      excelRow: index + 2,
      id: String(row?.[col.id] || '').trim(),
      scene: String(row?.[col.scene] || ''),
      prompt: String(row?.[col.prompt] || ''),
      keyPoint: String(row?.[col.keyPoint] || ''),
      sourceType: 'xlsx',
    }))
    .filter(item => item.id);
}

function loadCases() {
  return /\.md$/i.test(inputFile) ? loadMarkdownCases(inputFile) : loadXlsxCases(inputFile);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function httpProbe(targetUrl, timeoutMs = 5000, headers = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const url = new URL(targetUrl);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers,
      timeout: timeoutMs,
    }, res => {
      res.resume();
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 400,
        statusCode: res.statusCode,
        elapsedMs: Date.now() - started,
      }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: `timeout:${timeoutMs}`, elapsedMs: Date.now() - started });
    });
    req.on('error', error => resolve({ ok: false, error: error.message, elapsedMs: Date.now() - started }));
    req.end();
  });
}

function authCookieHeader(authFile) {
  try {
    const authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    const cookies = Array.isArray(authData.cookies)
      ? authData.cookies
      : Array.isArray(authData.authData?.cookies)
        ? authData.authData.cookies
        : [];
    return cookies
      .filter(cookie => cookie && cookie.name && cookie.value)
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  } catch {
    return '';
  }
}

function startDefaultDevServer(baseUrl) {
  const port = new URL(baseUrl).port || '8002';
  const out = fs.openSync(devOutFile, 'a');
  const err = fs.openSync(devErrFile, 'a');
  const child = spawn('cmd.exe', ['/c', 'npm.cmd run dev:clean'], {
    cwd: frontendDir,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
  });
  child.unref();
  return { pid: child.pid, port, outFile: devOutFile, errFile: devErrFile };
}

async function ensureAppOpen(baseUrl) {
  const before = await httpProbe(`${baseUrl}/`, 5000);
  if (before.ok) return { ok: true, before, action: 'already_open' };
  const started = startDefaultDevServer(baseUrl);
  let after = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    after = await httpProbe(`${baseUrl}/`, 5000);
    if (after.ok) return { ok: true, before, after, action: 'started_dev_server', started };
  }
  return { ok: false, before, after, action: 'start_attempt_failed', started };
}

async function selfCheck(payload = {}) {
  const baseUrl = String(payload.baseUrl || process.env.SECOND_ROUND_BASE_URL || DEFAULT_BASE_URL);
  const authFile = path.resolve(String(payload.authFile || process.env.SECOND_ROUND_AUTH_FILE || DEFAULT_AUTH_FILE));
  const cookieHeader = authCookieHeader(authFile);
  const app = payload.repair === false ? await httpProbe(`${baseUrl}/`, 5000) : await ensureAppOpen(baseUrl);
  const auth = cookieHeader
    ? await httpProbe(`${baseUrl}/api/xiaoqiao/auth/me`, 5000, { cookie: cookieHeader })
    : { ok: false, error: 'auth cookie file missing or empty' };
  const inputExists = fs.existsSync(inputFile);
  let readableCaseCount = 0;
  let inputError = '';
  try {
    readableCaseCount = loadCases().length;
  } catch (error) {
    inputError = error.message;
  }

  return {
    ok: app.ok && auth.ok && inputExists && readableCaseCount > 0,
    baseUrl,
    app,
    auth: { ...auth, loginRequired: !auth.ok },
    authFile,
    inputFile,
    input: {
      ok: inputExists && readableCaseCount > 0,
      exists: inputExists,
      caseCount: readableCaseCount,
      error: inputError,
    },
  };
}

function matchCases(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return cases.slice(0, 20);
  return cases
    .filter(item => [
      item.id,
      item.scene,
      item.prompt,
      item.keyPoint,
      String(item.excelRow),
    ].some(value => String(value || '').toLowerCase().includes(q)))
    .slice(0, 50);
}

function resolveRunTarget(payload) {
  const excelRow = Number(payload.excelRow || payload.row || 0);
  if (excelRow) {
    const found = cases.find(item => item.excelRow === excelRow);
    if (!found) throw Object.assign(new Error(`Excel row not found: ${excelRow}`), { statusCode: 404 });
    return found;
  }

  const promptIncludes = String(payload.promptIncludes || payload.prompt || '').trim();
  const caseId = String(payload.caseId || payload.id || '').trim();
  const sceneIncludes = String(payload.sceneIncludes || payload.scene || '').trim();

  let matches = cases;
  if (caseId) matches = matches.filter(item => item.id === caseId);
  if (promptIncludes) matches = matches.filter(item => item.prompt.includes(promptIncludes));
  if (sceneIncludes) matches = matches.filter(item => item.scene.includes(sceneIncludes));

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw Object.assign(new Error('No matching test case'), { statusCode: 404 });
  }
  throw Object.assign(new Error('Ambiguous test case; pass excelRow or a more specific prompt/scene'), {
    statusCode: 409,
    matches: matches.slice(0, 20),
  });
}

function parseRunnerOutput(text) {
  const resultFile = text.match(/结果文件:\s*(.+\.xlsx)/)?.[1]?.trim() || '';
  const total = Number(text.match(/总计:\s*(\d+)\s*条/)?.[1] || 0);
  const passed = Number(text.match(/通过:\s*(\d+)/)?.[1] || 0);
  const blocked = Number(text.match(/阻断:\s*(\d+)/)?.[1] || 0);
  const failed = Number(text.match(/失败:\s*(\d+)/)?.[1] || 0);
  const errored = Number(text.match(/错误:\s*(\d+)/)?.[1] || 0);
  const passRate = text.match(/通过率:\s*([0-9.]+%)/)?.[1] || '';
  const verdictLine = text.split(/\r?\n/).find(line => /通过|失败|阻断|错误/.test(line) && /\(\d+(\.\d+)?s\)/.test(line)) || '';
  return { resultFile, total, passed, blocked, failed, errored, passRate, verdictLine };
}

function makeJob(payload, target) {
  const limit = Number(payload.limit || 1);
  const env = {
    ...process.env,
    SECOND_ROUND_AUTH_FILE: String(payload.authFile || process.env.SECOND_ROUND_AUTH_FILE || DEFAULT_AUTH_FILE),
    SECOND_ROUND_BASE_URL: String(payload.baseUrl || process.env.SECOND_ROUND_BASE_URL || DEFAULT_BASE_URL),
    SECOND_ROUND_INPUT_FILE: String(payload.inputFile || process.env.SECOND_ROUND_INPUT_FILE || inputFile),
    SECOND_ROUND_MAX_SERVER_RSS_MB: String(payload.maxServerRssMb || process.env.SECOND_ROUND_MAX_SERVER_RSS_MB || 8192),
    SECOND_ROUND_ALLOW_SERVER_RESTART: String(payload.allowServerRestart ?? process.env.SECOND_ROUND_ALLOW_SERVER_RESTART ?? '1'),
    SECOND_ROUND_START_FROM_EXCEL_ROW: String(target.excelRow),
    SECOND_ROUND_LIMIT: String(limit > 0 ? limit : 1),
  };

  delete env.SECOND_ROUND_CASE_IDS;
  delete env.SECOND_ROUND_START_FROM_CASE_ID;

  return {
    id: String(nextJobId++),
    status: 'running',
    target,
    request: payload,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: '',
    summary: null,
    env: {
      SECOND_ROUND_AUTH_FILE: env.SECOND_ROUND_AUTH_FILE,
      SECOND_ROUND_BASE_URL: env.SECOND_ROUND_BASE_URL,
      SECOND_ROUND_INPUT_FILE: env.SECOND_ROUND_INPUT_FILE,
      SECOND_ROUND_MAX_SERVER_RSS_MB: env.SECOND_ROUND_MAX_SERVER_RSS_MB,
      SECOND_ROUND_ALLOW_SERVER_RESTART: env.SECOND_ROUND_ALLOW_SERVER_RESTART,
      SECOND_ROUND_START_FROM_EXCEL_ROW: env.SECOND_ROUND_START_FROM_EXCEL_ROW,
      SECOND_ROUND_LIMIT: env.SECOND_ROUND_LIMIT,
    },
    childEnv: env,
  };
}

function startRun(payload) {
  if (currentJob) {
    throw Object.assign(new Error('A test job is already running'), { statusCode: 409, job: publicJob(currentJob) });
  }

  const target = resolveRunTarget(payload);
  const job = makeJob(payload, target);
  currentJob = job;
  lastJob = job;

  const child = spawn(process.execPath, [runnerFile], {
    cwd: repoRoot,
    env: job.childEnv,
    windowsHide: true,
  });

  const append = chunk => {
    job.output += chunk.toString();
    if (job.output.length > 1024 * 256) job.output = job.output.slice(-1024 * 256);
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('exit', code => {
    job.exitCode = code;
    job.status = code === 0 ? 'finished' : 'failed';
    job.finishedAt = new Date().toISOString();
    job.summary = parseRunnerOutput(job.output);
    delete job.childEnv;
    currentJob = null;
  });
  child.on('error', error => {
    job.exitCode = null;
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.summary = { error: error.message };
    delete job.childEnv;
    currentJob = null;
  });

  return job;
}

function publicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    target: job.target,
    request: job.request,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    exitCode: job.exitCode,
    env: job.env,
    summary: job.summary,
    outputTail: job.output.slice(-12000),
  };
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      pid: process.pid,
      startedAt,
      serviceFile: __filename,
      runnerFile,
      defaultBaseUrl: DEFAULT_BASE_URL,
      inputFile,
      currentJob: publicJob(currentJob),
      lastJob: publicJob(lastJob),
    });
  }

  if (req.method === 'GET' && url.pathname === '/self-check') {
    const result = await selfCheck({});
    return sendJson(res, result.ok ? 200 : 503, result);
  }

  if (req.method === 'POST' && url.pathname === '/self-check') {
    const payload = await readJson(req);
    const result = await selfCheck(payload);
    return sendJson(res, result.ok ? 200 : 503, result);
  }

  if (req.method === 'GET' && url.pathname === '/cases') {
    return sendJson(res, 200, { count: cases.length, cases: matchCases(url.searchParams.get('q')) });
  }

  if (req.method === 'POST' && url.pathname === '/reload-cases') {
    cases = loadCases();
    return sendJson(res, 200, { ok: true, count: cases.length });
  }

  if (req.method === 'POST' && url.pathname === '/run') {
    const payload = await readJson(req);
    const job = startRun(payload);
    return sendJson(res, 202, publicJob(job));
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    return sendJson(res, 200, { currentJob: publicJob(currentJob), lastJob: publicJob(lastJob) });
  }

  sendJson(res, 404, { error: 'not found' });
}

const server = http.createServer((req, res) => {
  route(req, res).catch(error => {
    sendJson(res, error.statusCode || 500, {
      error: error.message,
      matches: error.matches,
      job: error.job,
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[second-round-test-service] listening on http://${HOST}:${PORT}`);
  console.log(`[second-round-test-service] loaded ${cases.length} test cases`);
});








