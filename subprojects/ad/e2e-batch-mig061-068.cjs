const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const REPORT_DIR = path.join(__dirname, '.test-reports');
const BASE_URLS = (process.env.E2E_BASE_URL
  ? [process.env.E2E_BASE_URL]
  : ['http://10.236.14.27:8003', 'http://10.236.14.27:8002']
).map(item => item.replace(/\/+$/, ''));
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function parseSseEvents(body) {
  const events = [];
  for (const line of String(body || '').split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try { events.push(JSON.parse(line.slice(6))); } catch {}
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
    return {
      index,
      type: event.type,
      status: event.status,
      contentType: event.contentType,
      error: event.error,
      bodyPreview: event.bodyPreview,
      eventType: event.event?.type,
      eventStatus: event.event?.status,
      eventLabel: event.event?.label,
      toolName: event.event?.tool_name,
      hasSourceRefs: Array.isArray(event.event?.source_refs) && event.event.source_refs.length > 0,
      contractStatus: contract.status,
      sourceRefCount: Array.isArray(contract.source_refs) ? contract.source_refs.length : undefined,
      evidenceRefCount: Array.isArray(contract.evidence_refs) ? contract.evidence_refs.length : undefined,
      toolCallTraceCount: Array.isArray(contract.tool_call_trace) ? contract.tool_call_trace.length : undefined,
      answerPreview: typeof event.result?.answer === 'string' ? event.result.answer.slice(0, 160) : undefined,
    };
  });
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

async function waitForNewChatCapture(chatResponsePromises, responseStart, timeoutMs = 20000) {
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

(async () => {
  log('=== BATCH: MIG-061 to MIG-068 (8 tests) ===');
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
  await context.addCookies((auth.cookies || []).map(c => ({
    name: c.name, value: c.value, domain: c.domain || '10.236.14.27',
    path: c.path || '/', httpOnly: c.httpOnly || false,
    secure: c.secure || false, sameSite: c.sameSite || 'Lax',
  })));
  await context.addInitScript(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData || {});

  const baseUrl = await gotoFirstAvailableBaseUrl(page);
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  if (page.url().includes('/login')) {
    await page.goto(baseUrl + '/', { waitUntil: 'commit', timeout: 60000 });
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await sleep(4000);

  const results = {};
  ensureDir(REPORT_DIR);

  for (const test of TESTS) {
    log('\n--- ' + test.id + ' ---');
    const eventStart = sseEvents.length;
    const responseStart = chatResponsePromises.length;
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
      };
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
    const capturedChatStream = await waitForNewChatCapture(chatResponsePromises, responseStart);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const foundKw = test.kw.filter(k => bodyText.includes(k));
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || bodyText.includes('暂无数据') || bodyText.includes('不存在') || foundKw.length >= 2;
    const caseEvents = sseEvents.slice(eventStart);
    const contract = contractAssertions(caseEvents);
    const contractHealthy = contract.hasDone
      && ['success', 'degraded'].includes(contract.contractStatus)
      && contract.hasResponseContract
      && contract.hasSourceRefs
      && contract.hasEvidenceRefs
      && contract.hasToolCallTrace
      && contract.hasProcessEvents;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer + ' | contractHealthy: ' + contractHealthy);
    results[test.id] = {
      keywords: foundKw,
      hasAnswer,
      contractHealthy,
      contract,
      capturedChatStream,
      rawEventSummary: summarizeRawEvents(caseEvents),
    };
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'batch-mig061-068-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), tests: results }, null, 2));

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
})().catch(e => { console.error(e); process.exit(1); });
