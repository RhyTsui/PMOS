const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const REPORT_DIR = path.join(__dirname, '.test-reports');
const BASE_URLS = (process.env.E2E_BASE_URL
  ? [process.env.E2E_BASE_URL]
  : ['http://10.236.14.27:8003', 'http://10.236.14.27:8002']
).map(item => item.replace(/\/+$/, ''));
const LOGIN_WAIT_MS = Number(process.env.E2E_LOGIN_WAIT_MS || 300000);
const STREAM_WAIT_MS = Number(process.env.E2E_STREAM_WAIT_MS || 180000);
const E2E_MODE = process.env.E2E_MODE || 'api';
const E2E_PROJECT = {
  appId: process.env.E2E_PROJECT_APP_ID || '10100042',
  appName: process.env.E2E_PROJECT_APP_NAME || '指间山海',
  appAlias: process.env.E2E_PROJECT_APP_ALIAS || '指间山海',
};
const E2E_PROJECT_CONTEXT = process.env.E2E_PROJECT_CONTEXT || `项目范围：${E2E_PROJECT.appName}（APPID: ${E2E_PROJECT.appId}）`;
const E2E_CASE_FILTER = (process.env.E2E_CASE || '').trim();
const SERVER_MEMORY_GUARD_MB = Number(process.env.E2E_MAX_SERVER_RSS_MB || 3072);
const MEMORY_SAMPLE_LIMIT = Number(process.env.E2E_MEMORY_SAMPLE_LIMIT || 200);
let activeBaseUrl = '';
let memoryPeakMb = 0;
const memorySamples = [];
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function parseListeningPidsFromNetstat(text, port) {
  const output = new Set();
  const portToken = `:${port}`;
  for (const line of String(text || '').split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    const localAddress = parts[1] || '';
    const state = parts[3] || '';
    const pid = parts[4] || '';
    const isPortMatch = localAddress.endsWith(portToken) || localAddress.includes(`${portToken} `);
    if (isPortMatch && state === 'LISTENING' && /^\d+$/.test(pid)) output.add(Number(pid));
  }
  return Array.from(output);
}

function parseTasklistMemoryMb(text) {
  const line = String(text || '').split(/\r?\n/).find(item => item.trim() && !/^INFO:/i.test(item.trim()));
  if (!line) return 0;
  const match = line.match(/"([^"]*)"\s*$/);
  const raw = match ? match[1] : line.split(',').pop() || '';
  const kb = Number(raw.replace(/[^\d]/g, ''));
  return kb > 0 ? Math.round(kb / 1024) : 0;
}

function serverPort(baseUrl = activeBaseUrl) {
  if (!baseUrl) return 0;
  const parsed = new URL(baseUrl);
  if (parsed.port) return Number(parsed.port);
  return parsed.protocol === 'https:' ? 443 : 80;
}

function findServerPids(baseUrl = activeBaseUrl) {
  const port = serverPort(baseUrl);
  if (!port) return [];
  try {
    return parseListeningPidsFromNetstat(execSync('netstat -ano', { encoding: 'utf8' }), port);
  } catch {
    return [];
  }
}

function readProcessMemoryMb(pid) {
  try {
    return parseTasklistMemoryMb(execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' }));
  } catch {
    return 0;
  }
}

function rememberMemorySample(sample, limit = MEMORY_SAMPLE_LIMIT) {
  memorySamples.push(sample);
  if (Number.isFinite(limit) && limit > 0 && memorySamples.length > limit) {
    memorySamples.splice(0, memorySamples.length - limit);
  }
  return sample;
}

function captureMemory(phase, caseId = '') {
  const pids = findServerPids();
  const processes = pids.map(pid => ({ pid, workingSetMb: readProcessMemoryMb(pid) }));
  const sample = rememberMemorySample({
    phase,
    caseId,
    sampledAt: new Date().toISOString(),
    guardMb: SERVER_MEMORY_GUARD_MB,
    baseUrl: activeBaseUrl,
    pids,
    processes,
    maxWorkingSetMb: Math.max(0, ...processes.map(item => item.workingSetMb || 0)),
  });
  memoryPeakMb = Math.max(memoryPeakMb, sample.maxWorkingSetMb || 0);
  return sample;
}

function memoryGuardFailure() {
  if (!Number.isFinite(SERVER_MEMORY_GUARD_MB) || SERVER_MEMORY_GUARD_MB <= 0) return null;
  const snapshot = captureMemory('memory_guard');
  return snapshot.maxWorkingSetMb > SERVER_MEMORY_GUARD_MB
    ? {
      verdict: 'blocked',
      reason: `server memory guard exceeded: ${snapshot.maxWorkingSetMb}MB > ${SERVER_MEMORY_GUARD_MB}MB`,
      memoryGuard: snapshot,
    }
    : null;
}

function runMemoryGuardSelfTest() {
  const netstatSample = [
    '  TCP    0.0.0.0:8002           0.0.0.0:0              LISTENING       31248',
    '  TCP    127.0.0.1:52075        127.0.0.1:8002         ESTABLISHED     40672',
    '  TCP    [::1]:8003             [::]:0                 LISTENING       35092',
  ].join('\n');
  const pids8002 = parseListeningPidsFromNetstat(netstatSample, 8002);
  const pids8003 = parseListeningPidsFromNetstat(netstatSample, 8003);
  if (pids8002.length !== 1 || pids8002[0] !== 31248) {
    throw new Error(`expected 8002 listening pid 31248, got ${pids8002.join(',')}`);
  }
  if (pids8003.length !== 1 || pids8003[0] !== 35092) {
    throw new Error(`expected 8003 listening pid 35092, got ${pids8003.join(',')}`);
  }
  const memoryMb = parseTasklistMemoryMb('"node.exe","31248","Console","1","4,194,304 K"');
  if (memoryMb !== 4096) {
    throw new Error(`expected tasklist memory 4096MB, got ${memoryMb}`);
  }
  memorySamples.length = 0;
  rememberMemorySample({ phase: 'a', maxWorkingSetMb: 100 }, 2);
  rememberMemorySample({ phase: 'b', maxWorkingSetMb: 200 }, 2);
  rememberMemorySample({ phase: 'c', maxWorkingSetMb: 300 }, 2);
  if (memorySamples.length !== 2 || memorySamples[0].phase !== 'b' || memorySamples[1].phase !== 'c') {
    throw new Error(`expected bounded memory samples to keep last 2 entries, got ${JSON.stringify(memorySamples)}`);
  }
  const blocked = {
    verdict: 'blocked',
    reason: 'server memory guard exceeded: 4096MB > 3072MB',
    memoryGuard: { maxWorkingSetMb: 4096, guardMb: 3072 },
  };
  if (blocked.verdict !== 'blocked' || !blocked.reason.includes('4096MB') || blocked.memoryGuard.maxWorkingSetMb !== 4096) {
    throw new Error('expected memory guard blocked shape');
  }
  console.log('mig061-068 memory guard self-test passed');
}

function parseSseEvents(body) {
  const events = [];
  for (const line of String(body || '').split('\n')) {
    const match = line.match(/^data:\s?(.*)$/);
    if (!match) continue;
    try { events.push(JSON.parse(match[1])); } catch {}
  }
  return events;
}

function arrayFromContract(contract, snakeKey, camelKey) {
  const value = contract?.[snakeKey] || contract?.[camelKey] || [];
  return Array.isArray(value) ? value : [];
}

function contractAssertions(events) {
  const done = [...events].reverse().find(e => e.type === 'done') || {};
  const contract = done.result?.response_contract || done.metadata?.response_contract || {};
  const metadataProcessEvents = done.metadata?.process_events;
  const processEvents = Array.isArray(metadataProcessEvents)
    ? metadataProcessEvents
    : events.filter(e => e.type === 'process_event').map(e => e.event || e);
  const sourceRefs = arrayFromContract(contract, 'source_refs', 'sourceRefs');
  const evidenceRefs = arrayFromContract(contract, 'evidence_refs', 'evidenceRefs');
  const toolCallTrace = arrayFromContract(contract, 'tool_call_trace', 'toolCallTrace');
  return {
    hasDone: Boolean(done.type === 'done'),
    contractStatus: contract.status || 'missing',
    hasResponseContract: Boolean(contract && Object.keys(contract).length),
    hasSourceRefs: sourceRefs.length > 0,
    hasEvidenceRefs: evidenceRefs.length > 0,
    hasToolCallTrace: toolCallTrace.length > 0,
    hasProcessEvents: processEvents.length > 0,
    sourceRefCount: sourceRefs.length,
    evidenceRefCount: evidenceRefs.length,
    toolCallTraceCount: toolCallTrace.length,
    processEventCount: processEvents.length,
  };
}

function summarizeRawEvents(events) {
  return events.map((event, index) => {
    const contract = event.result?.response_contract || event.metadata?.response_contract || {};
    const output = event.event?.output || {};
    const compactOutput = output && typeof output === 'object' ? {
      routeIntent: output.routeIntent,
      resolvedIntent: output.resolvedIntent,
      serviceIntent: output.serviceIntent,
      userRequirementTask: output.userRequirementTask,
      userRequirementServiceIntent: output.userRequirementServiceIntent,
      isReportQuery: output.isReportQuery,
      reportRouteMatch: output.reportRouteMatch,
      capabilityReportMatch: output.capabilityReportMatch,
      routeWarnings: output.routeWarnings,
      blockedBy: output.blockedBy,
      execution_decision: output.execution_decision,
      blocking_reason: output.blocking_reason,
      selected_tool_name: output.selected_tool_name,
      selected_capability_id: output.selected_capability_id,
      execution_decision: output.execution_decision,
      data_coverage: output.data_coverage,
      presentation_coverage: output.presentation_coverage,
      fallback_used: output.fallback_used,
      fallback_reason: output.fallback_reason,
      candidate_count: output.candidate_count,
      coverage_matrix: Array.isArray(output.coverage_matrix)
        ? output.coverage_matrix.slice(0, 8)
        : undefined,
    } : undefined;
    return {
      index,
      type: event.type,
      status: event.status,
      contentType: event.contentType,
      error: event.error,
      bodyPreview: event.bodyPreview,
      intent: event.intent,
      hasThinking: event.hasThinking,
      toolsUsed: event.toolsUsed || event.tools_used,
      eventType: event.event?.type,
      eventStatus: event.event?.status,
      eventLabel: event.event?.label,
      toolName: event.event?.tool_name,
      output: compactOutput,
      hasSourceRefs: Array.isArray(event.event?.source_refs) && event.event.source_refs.length > 0,
      contractStatus: contract.status,
      sourceRefCount: Array.isArray(contract.source_refs) ? contract.source_refs.length : undefined,
      evidenceRefCount: Array.isArray(contract.evidence_refs) ? contract.evidence_refs.length : undefined,
      toolCallTraceCount: Array.isArray(contract.tool_call_trace) ? contract.tool_call_trace.length : undefined,
      answerPreview: typeof event.result?.answer === 'string' ? event.result.answer.slice(0, 160) : undefined,
    };
  });
}

function answerFromEvents(events) {
  const done = [...events].reverse().find(e => e.type === 'done') || {};
  const doneAnswer = typeof done.result?.answer === 'string' ? done.result.answer : '';
  const streamedAnswer = events
    .filter(event => event.type === 'content' && typeof event.content === 'string')
    .map(event => event.content)
    .join('');
  return doneAnswer || streamedAnswer;
}

async function gotoFirstAvailableBaseUrl(page) {
  let lastError;
  for (const baseUrl of BASE_URLS) {
    try {
      await page.goto(baseUrl + '/', { waitUntil: 'commit', timeout: 60000 });
      return baseUrl;
    } catch (error) {
      lastError = error;
      log('Base URL unavailable: ' + baseUrl + ' (' + (error instanceof Error ? error.message.split('\n')[0] : String(error)) + ')');
    }
  }
  throw lastError || new Error('No E2E base URL available');
}

async function waitForLoginIfNeeded(page, baseUrl) {
  if (!page.url().includes('/login')) return false;
  log('Login required. Please scan or complete login in the opened browser within ' + Math.round(LOGIN_WAIT_MS / 1000) + 's.');
  const startedAt = Date.now();
  let lastError = '';
  let lastAuthStatus = '';
  while (Date.now() - startedAt < LOGIN_WAIT_MS) {
    if (!page.url().includes('/login')) break;
    const authCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/xiaoqiao/auth/me', { cache: 'no-store' });
        return { ok: response.ok, status: response.status };
      } catch {
        return { ok: false, status: 0 };
      }
    }).catch(error => {
      lastError = error instanceof Error ? error.message.split('\n')[0] : String(error);
      return { ok: false, status: -1 };
    });
    lastAuthStatus = String(authCheck.status);
    if (authCheck.ok) break;
    await page.waitForURL(url => !url.pathname.startsWith('/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 1000,
    }).catch(error => {
      lastError = error instanceof Error ? error.message.split('\n')[0] : String(error);
    });
  }
  if (page.url().includes('/login')) {
    const authCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/xiaoqiao/auth/me', { cache: 'no-store' });
        return { ok: response.ok, status: response.status };
      } catch {
        return { ok: false, status: 0 };
      }
    }).catch(() => ({ ok: false, status: -1 }));
    lastAuthStatus = String(authCheck.status);
    if (!authCheck.ok) throw new Error('login_timeout: auth/me status ' + (lastAuthStatus || 'unknown') + '; ' + (lastError || 'login page did not leave /login'));
  }
  await page.goto(baseUrl + '/', { waitUntil: 'commit', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  return true;
}

async function persistAuthState(context, page, auth, baseUrl) {
  const cookies = await context.cookies(baseUrl).catch(() => []);
  const localStorageState = await page.evaluate(() => {
    const out = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) out[key] = localStorage.getItem(key);
    }
    return out;
  }).catch(() => ({}));
  const tokenCookie = cookies.find(cookie => cookie.name === 'xiaoqiao_auth_token');
  const sessionCookie = cookies.find(cookie => cookie.name === 'xiaoqiao_auth_session');
  const token = tokenCookie?.value
    || localStorageState.xiaoqiao_auth_token
    || localStorageState.__YK_LOGIN_TOKEN__
    || auth.authData?.token;
  const sessionId = sessionCookie?.value
    || localStorageState.xiaoqiao_auth_session
    || localStorageState.__YK_LOGIN_SESSION_ID__
    || auth.authData?.sessionId;
  const nextAuth = {
    ...auth,
    cookies: cookies.length ? cookies : auth.cookies,
    authData: {
      ...(auth.authData || {}),
      token,
      sessionId,
      tokenCookie: tokenCookie || auth.authData?.tokenCookie,
      sessionCookie: sessionCookie || auth.authData?.sessionCookie,
      cookies,
      allLocalStorage: localStorageState,
    },
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(nextAuth, null, 2));
  log('Auth state persisted: cookies=' + cookies.length + ', token=' + Boolean(token) + ', session=' + Boolean(sessionId));
}

async function waitForNewChatCapture(chatResponsePromises, responseStart, timeoutMs = STREAM_WAIT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (chatResponsePromises.length > responseStart) {
      await Promise.race([
        Promise.allSettled(chatResponsePromises.slice(responseStart)),
        sleep(12000),
      ]);
      return true;
    }
    await sleep(500);
  }
  return false;
}

async function getBrowserCaptureCount(page) {
  return page.evaluate(() => Array.isArray(window.__chatSseCaptures) ? window.__chatSseCaptures.length : 0)
    .catch(() => 0);
}

async function waitForBrowserChatCapture(page, captureStart, timeoutMs = STREAM_WAIT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ready = await page.evaluate((start) => {
      const captures = Array.isArray(window.__chatSseCaptures) ? window.__chatSseCaptures.slice(start) : [];
      return captures.some(item => {
        if (!item) return false;
        if (item.error) return true;
        const body = typeof item.body === 'string' ? item.body : '';
        if (body.includes('"type":"done"')) return true;
        return item.complete && body.includes('"type":"error"');
      });
    }, captureStart).catch(() => false);
    if (ready) return true;
    await sleep(500);
  }
  return false;
}

async function readBrowserCapturedEvents(page, captureStart) {
  const captures = await page.evaluate((start) => (
    Array.isArray(window.__chatSseCaptures) ? window.__chatSseCaptures.slice(start) : []
  ), captureStart).catch(() => []);
  const events = [];
  for (const capture of captures) {
    events.push({
      type: 'browser_capture_response',
      url: capture?.url,
      status: capture?.status,
      contentType: capture?.contentType,
      error: capture?.error,
      bodyPreview: typeof capture?.body === 'string' ? capture.body.slice(0, 240) : undefined,
    });
    if (typeof capture?.body === 'string') {
      events.push(...parseSseEvents(capture.body));
    }
  }
  return events;
}

async function browserApiChat(page, test) {
  const response = await page.evaluate(async ({ input, caseId, projectContext, currentProject }) => {
    const response = await window.fetch('/api/chat', {
      signal: AbortSignal.timeout(180000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conversation-id': `mig061-068-${caseId}-${Date.now()}`,
        'x-pathname': '/e2e/mig061-068',
      },
      body: JSON.stringify({
        message: input,
        intent: 'general_chat',
        history: [],
        projectContext,
        metadata: {
          e2e_case_id: caseId,
          e2e_batch: 'MIG-061~068',
          projectContext,
          currentProject,
          projectContextDebug: {
            projectLoadStatus: 'ready',
            selectedProject: { appId: currentProject.appId, appName: currentProject.appName },
            projectContextTextEmpty: false,
            metadataProjectContextPresent: true,
            warnings: [],
          },
        },
      }),
    });
    const raw = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      raw,
    };
  }, { input: test.input, caseId: test.id, projectContext: E2E_PROJECT_CONTEXT, currentProject: E2E_PROJECT });
  const events = parseSseEvents(response.raw);
  return {
    ...response,
    events: [
      {
        type: 'browser_api_response',
        status: response.status,
        contentType: response.contentType,
        bodyPreview: response.raw.slice(0, 240),
      },
      ...events,
    ],
  };
}

const TESTS = [
  { id: 'MIG-061', input: '指间山海 2026-03-25 广告小时报表中，广告投放部媒体筛选：自定义跳转时段激活数', kw: ['小时', '激活', '自定义', '时段'] },
  { id: 'MIG-062', input: '指间山海 2026 年 3 月广告 ROI 月报中，广告投放部按不存在的应用类型查看累计 ROI', kw: ['月报', 'ROI', '应用类型'] },
  { id: 'MIG-063', input: '指间山海最近 7 天（不含当天）的投放日报效果综合评估', kw: ['7 天', '日报', '评估', '投放'] },
  { id: 'MIG-064', input: '给我生成指间山海上周广告投放部的投放效果周报，按媒体、应用类型拆分并包含 ROI 和留存结论', kw: ['周报', '媒体', '应用', 'ROI', '留存'] },
  { id: 'MIG-065', input: '请评估指间山海 2026 年 3 月广告投放部的月报表现，要求结合媒体、应用类型、ROI 和留存给出结论', kw: ['月报', '媒体', '应用', 'ROI', '留存'] },
  { id: 'MIG-066', input: '请分析指间山海 2026-03-25 广告投放部日报中表现最差的媒体和应用类型组合，并给出优化建议', kw: ['日报', '媒体', '应用', '最差', '建议'] },
  { id: 'MIG-067', input: '指间山海 20260521 的激活数是多少？如果超过 700 就算好', kw: ['激活', '700', '20260521'] },
  { id: 'MIG-068', input: '指间山海 20250325 哪个媒体的 首日 ROI 最高？数据是多少？', kw: ['媒体', 'ROI', '最高', '20250325'] },
];
const ACTIVE_TESTS = E2E_CASE_FILTER
  ? TESTS.filter(test => test.id === E2E_CASE_FILTER || test.id.includes(E2E_CASE_FILTER))
  : TESTS;

(async () => {
  if (process.env.E2E_MEMORY_SELF_TEST === '1') {
    runMemoryGuardSelfTest();
    return;
  }
  log('=== BATCH: MIG-061 to MIG-068 (' + ACTIVE_TESTS.length + ' tests' + (E2E_CASE_FILTER ? ', filter=' + E2E_CASE_FILTER : '') + ') ===');
  const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, '.auth-state'),
    { headless: false, viewport: { width: 1440, height: 900 } }
  );
  const page = context.pages()[0] || await context.newPage();
  const sseEvents = [];
  const chatResponsePromises = [];
  page.on('response', async resp => {
    if (!resp.url().includes('/api/chat')) return;
    if (!String(resp.headers()['content-type'] || '').includes('event-stream')) return;
    const responseMeta = {
      type: 'capture_response',
      url: resp.url(),
      status: resp.status(),
      contentType: String(resp.headers()['content-type'] || ''),
    };
    const capture = resp.text()
      .then(body => {
        const parsed = parseSseEvents(body);
        sseEvents.push(responseMeta, ...parsed);
        if (!parsed.length) {
          sseEvents.push({ type: 'capture_empty_body', status: resp.status(), bodyPreview: String(body || '').slice(0, 240) });
        }
      })
      .catch(error => {
        sseEvents.push(responseMeta, { type: 'capture_error', status: resp.status(), error: error instanceof Error ? error.message : String(error) });
      });
    chatResponsePromises.push(capture);
  });
  const authCookies = (auth.cookies || []).map(c => ({
    name: c.name, value: c.value, domain: c.domain || '10.236.14.27',
    path: c.path || '/', httpOnly: c.httpOnly || false,
    secure: c.secure || false, sameSite: c.sameSite || 'Lax',
  }));
  if (auth.authData?.token) {
    authCookies.push({
      name: 'xiaoqiao_auth_token',
      value: auth.authData.token,
      domain: '10.236.14.27',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });
  }
  if (auth.authData?.sessionId) {
    authCookies.push({
      name: 'xiaoqiao_auth_session',
      value: auth.authData.sessionId,
      domain: '10.236.14.27',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });
  }
  await context.addCookies(authCookies);
  await context.addInitScript(d => {
    window.__chatSseCaptures = [];
    if (!window.__chatSseFetchCaptureInstalled) {
      window.__chatSseFetchCaptureInstalled = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (d.mode === 'api') return response;
        try {
          const input = args[0];
          const url = typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input?.url || '';
          const contentType = response.headers.get('content-type') || '';
          if (String(url).includes('/api/chat') && contentType.includes('event-stream')) {
            const record = {
              url: String(url),
              status: response.status,
              contentType,
              complete: false,
              body: '',
            };
            window.__chatSseCaptures.push(record);
            if (response.body && typeof response.body.tee === 'function') {
              const [captureStream, appStream] = response.body.tee();
              const appResponse = new Response(appStream, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
              (async () => {
                const reader = captureStream.getReader();
                const decoder = new TextDecoder();
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    record.body += decoder.decode(value, { stream: true });
                  }
                  record.body += decoder.decode();
                } catch (error) {
                  record.error = error instanceof Error ? error.message : String(error);
                } finally {
                  record.complete = true;
                }
              })();
              return appResponse;
            }
            response.clone().text()
              .then((body) => {
                record.body = body;
                record.complete = true;
              })
              .catch((error) => {
                record.error = error instanceof Error ? error.message : String(error);
                record.complete = true;
              });
          }
        } catch (error) {
          window.__chatSseCaptures.push({
            url: 'fetch-capture-installation',
            status: 0,
            contentType: '',
            error: error instanceof Error ? error.message : String(error),
            complete: true,
          });
        }
        return response;
      };
    }
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.token) localStorage.setItem('xiaoqiao_auth_token', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
    if (d.sessionId) localStorage.setItem('xiaoqiao_auth_session', d.sessionId);
  }, { ...(auth.authData || {}), mode: E2E_MODE });

  const baseUrl = await gotoFirstAvailableBaseUrl(page);
  activeBaseUrl = baseUrl;
  captureMemory('base_url_ready');
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.token) localStorage.setItem('xiaoqiao_auth_token', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
    if (d.sessionId) localStorage.setItem('xiaoqiao_auth_session', d.sessionId);
  }, auth.authData);
  await waitForLoginIfNeeded(page, baseUrl);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await sleep(4000);
  await waitForLoginIfNeeded(page, baseUrl);
  await persistAuthState(context, page, auth, baseUrl);

  const results = {};
  ensureDir(REPORT_DIR);
  const writeReport = (extra = {}) => {
    fs.writeFileSync(path.join(REPORT_DIR, 'batch-mig061-068-report.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: E2E_MODE,
      baseUrl,
      memoryGuard: captureMemory('report'),
      memoryPeakMb,
      memorySamples,
      tests: results,
      ...extra,
    }, null, 2));
  };

  if (E2E_MODE === 'api') {
    for (const test of ACTIVE_TESTS) {
      log('\n--- ' + test.id + ' ---');
      const memoryBefore = captureMemory('case_start', test.id);
      const memoryBlock = memoryGuardFailure();
      if (memoryBlock) {
        log('BLOCKED: ' + memoryBlock.reason);
        results[test.id] = {
          mode: 'browser_api',
          verdict: memoryBlock.verdict,
          reason: memoryBlock.reason,
          hasAnswer: false,
          contractHealthy: false,
          capturedChatStream: false,
          memoryBefore,
          memoryGuard: memoryBlock.memoryGuard,
        };
        writeReport({ stoppedBy: memoryBlock.reason });
        break;
      }
      const apiResult = await browserApiChat(page, test);
      const memoryAfter = captureMemory('case_end', test.id);
      const answer = answerFromEvents(apiResult.events);
      const foundKw = test.kw.filter(k => answer.includes(k) || apiResult.raw.includes(k));
      const hasAnswer = answer.length > 0 || foundKw.length >= 2;
      const contract = contractAssertions(apiResult.events);
      const contractHealthy = apiResult.ok
        && contract.hasDone
        && ['success', 'degraded'].includes(contract.contractStatus)
        && contract.hasResponseContract
        && contract.hasSourceRefs
        && contract.hasEvidenceRefs
        && contract.hasToolCallTrace
        && contract.hasProcessEvents;
      log('HTTP: ' + apiResult.status + ' | KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer + ' | contractHealthy: ' + contractHealthy);
      results[test.id] = {
        mode: 'browser_api',
        httpStatus: apiResult.status,
        contentType: apiResult.contentType,
        keywords: foundKw,
        hasAnswer,
        contractHealthy,
        contract,
        capturedChatStream: apiResult.events.length > 1,
        rawEventSummary: summarizeRawEvents(apiResult.events),
        memoryBefore,
        memoryAfter,
      };
      await page.evaluate(() => { window.__chatSseCaptures = []; }).catch(() => {});
      writeReport();
    }

    writeReport();

    log('\n=== SUMMARY ===');
    let pass = 0, fail = 0;
    for (const [id, r] of Object.entries(results)) {
      const p = r.capturedChatStream && r.hasAnswer && r.keywords.length > 0 && r.contractHealthy;
      if (p) pass++; else fail++;
      log(id + ': ' + (p ? 'PASS ✓' : 'FAIL ✗'));
    }
    log('\nTotal: ' + pass + ' PASS, ' + fail + ' FAIL');

    await context.close();
    log('DONE');
    return;
  }

  for (const test of ACTIVE_TESTS) {
    log('\n--- ' + test.id + ' ---');
    const memoryBefore = captureMemory('case_start', test.id);
    const memoryBlock = memoryGuardFailure();
    if (memoryBlock) {
      log('BLOCKED: ' + memoryBlock.reason);
      results[test.id] = {
        verdict: memoryBlock.verdict,
        reason: memoryBlock.reason,
        hasAnswer: false,
        contractHealthy: false,
        capturedChatStream: false,
        memoryBefore,
        memoryGuard: memoryBlock.memoryGuard,
      };
      writeReport({ stoppedBy: memoryBlock.reason });
      break;
    }
    const eventStart = sseEvents.length;
    const responseStart = chatResponsePromises.length;
    const browserCaptureStart = await getBrowserCaptureCount(page);
    const newBtn = await page.$('button:has-text("开启新对话")');
    if (newBtn) { await newBtn.click(); await sleep(3000); }

    await page.waitForSelector('textarea', { timeout: 10000 }).catch(() => null);
    const ta = await page.$('textarea');
    if (!ta) {
      results[test.id] = {
        error: 'no textarea',
        url: page.url(),
        title: await page.title().catch(() => ''),
        bodyPreview: await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(error => String(error)),
        memoryBefore,
      };
      writeReport();
      continue;
    }
    await ta.click(); await ta.fill(test.input); await sleep(300);
    await page.keyboard.press('Enter');
    await sleep(1500);

    let lastLen = 0, stableCount = 0;
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const t = await page.evaluate(() => document.body.innerText);
      if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
      else stableCount++;
      if (stableCount >= 4 && t.length > 100) { log('Stable ' + ((i+1)*2) + 's'); break; }
    }
    await sleep(1500);
    const browserCapturedChatStream = await waitForBrowserChatCapture(page, browserCaptureStart);
    const cdpCapturedChatStream = await waitForNewChatCapture(chatResponsePromises, responseStart);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const foundKw = test.kw.filter(k => bodyText.includes(k));
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || bodyText.includes('暂无数据') || bodyText.includes('不存在') || foundKw.length >= 2;
    const browserEvents = await readBrowserCapturedEvents(page, browserCaptureStart);
    const caseEvents = browserEvents.length ? browserEvents : sseEvents.slice(eventStart);
    const capturedChatStream = browserCapturedChatStream || cdpCapturedChatStream;
    const contract = contractAssertions(caseEvents);
    const contractHealthy = contract.hasDone
      && ['success', 'degraded'].includes(contract.contractStatus)
      && contract.hasResponseContract
      && contract.hasSourceRefs
      && contract.hasEvidenceRefs
      && contract.hasToolCallTrace
      && contract.hasProcessEvents;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer + ' | contractHealthy: ' + contractHealthy);
    const memoryAfter = captureMemory('case_end', test.id);
    results[test.id] = {
      keywords: foundKw,
      hasAnswer,
      contractHealthy,
      contract,
      capturedChatStream,
      rawEventSummary: summarizeRawEvents(caseEvents),
      memoryBefore,
      memoryAfter,
    };
    sseEvents.length = 0;
    chatResponsePromises.length = 0;
    await page.evaluate(() => { window.__chatSseCaptures = []; }).catch(() => {});
    writeReport();
  }

  writeReport();

  log('\n=== SUMMARY ===');
  let pass = 0, fail = 0;
  for (const [id, r] of Object.entries(results)) {
    const p = r.capturedChatStream && r.hasAnswer && r.keywords.length > 0 && r.contractHealthy;
    if (p) pass++; else fail++;
    log(id + ': ' + (p ? 'PASS ✓' : 'FAIL ✗'));
  }
  log('\nTotal: ' + pass + ' PASS, ' + fail + ' FAIL');

  await context.close();
  log('DONE');
})().catch(e => {
  const message = e instanceof Error ? e.message : String(e);
  console.error(e);
  try {
    ensureDir(REPORT_DIR);
    fs.writeFileSync(path.join(REPORT_DIR, 'batch-mig061-068-report.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: E2E_MODE,
      setup_error: message,
      baseUrl: activeBaseUrl,
      memoryGuard: captureMemory('setup_error'),
      memoryPeakMb,
      memorySamples,
      tests: {},
    }, null, 2));
  } catch (reportError) {
    console.error('failed_to_write_e2e_error_report', reportError);
  }
  process.exit(1);
});
