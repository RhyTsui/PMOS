/**
 * E2E Test: MIG-001 - 天气查询（联网搜索）
 * Input: "南京本周日天气如何"
 * Expected: 调用联网搜索获取天气数据，返回结构化天气信息
 *
 * Round 1 failure: model said it has no internet capability.
 * Check: route arbitration, tool calls, search provider, SSE content.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://10.236.14.27:8002';
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');

function log(msg) { const ts = new Date().toISOString(); console.log(`[${ts}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadAuth() {
  if (!fs.existsSync(AUTH_FILE)) throw new Error('Auth file not found: ' + AUTH_FILE);
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
}

async function main() {
  log('========================================');
  log('E2E TEST: MIG-001 - 天气查询（联网搜索）');
  log('Input: "南京本周日天气如何"');
  log('Expected: 联网搜索获取天气数据');
  log('========================================');

  const auth = loadAuth();
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, '.auth-state', 'browser-context'),
    { headless: false, viewport: { width: 1440, height: 900 } }
  );
  const page = context.pages()[0] || await context.newPage();

  // Inject auth
  const cookies = (auth.cookies || []).map(c => ({
    name: c.name, value: c.value, domain: c.domain || '10.236.14.27',
    path: c.path || '/', httpOnly: c.httpOnly || false,
    secure: c.secure || false, sameSite: c.sameSite || 'Lax',
  }));
  await context.addCookies(cookies);

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

  const networkEvents = [];
  const sseChunks = [];
  const apiResponses = [];
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  page.on('request', req => {
    networkEvents.push({ phase: 'req', method: req.method(), url: req.url(), ts: Date.now() });
  });

  page.on('response', async resp => {
    const entry = { phase: 'res', status: resp.status(), url: resp.url(), ts: Date.now() };
    networkEvents.push(entry);

    if (resp.url().includes('/api/chat')) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('text/event-stream')) {
          const body = await resp.text();
          entry.isSSE = true;
          entry.bodyLength = body.length;
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) sseChunks.push(line.slice(6));
          }
          entry.sseChunkCount = sseChunks.length;
        } else {
          const body = await resp.text();
          entry.bodyLength = body.length;
        }
        apiResponses.push(entry);
      } catch (e) { entry.bodyError = e.message; apiResponses.push(entry); }
    }
  });

  // Navigate and login
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate((data) => {
    if (data.token) localStorage.setItem('__YK_LOGIN_TOKEN__', data.token);
    if (data.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', data.sessionId);
  }, auth.authData);
  await sleep(4000);

  if (page.url().includes('/login')) {
    log('ERROR: Not logged in!');
    await context.close();
    process.exit(1);
  }

  log('Logged in. Navigated to main page.');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig001-01-main.png'), fullPage: true });

  // Start new conversation to avoid history interference
  // Click "开启新对话" button
  const newChatBtn = await page.$('button:has-text("开启新对话")');
  if (newChatBtn) {
    await newChatBtn.click();
    await sleep(2000);
    log('Started new conversation.');
  }

  // Type and send
  const testInput = '南京本周日天气如何';
  const textarea = await page.$('textarea');
  if (!textarea) { log('ERROR: No textarea found'); await context.close(); process.exit(1); }

  await textarea.click();
  await textarea.fill(testInput);
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig001-02-typed.png'), fullPage: true });

  log('Sending: "' + testInput + '"');
  await page.keyboard.press('Enter');

  // Wait for user message to appear
  await sleep(1500);
  const userMsgVisible = (await page.evaluate(() => document.body.innerText)).includes(testInput);
  log('User message visible: ' + userMsgVisible);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig001-03-sent.png'), fullPage: true });

  // Wait for AI response (up to 90s for search)
  log('Waiting for AI response (up to 90s)...');
  let lastLen = 0;
  let stableCount = 0;
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const text = await page.evaluate(() => document.body.innerText);
    if (text.length !== lastLen) { lastLen = text.length; stableCount = 0; }
    else { stableCount++; }
    if (stableCount >= 4 && text.length > 200) {
      log('Response stable after ' + ((i+1)*2) + 's, length: ' + text.length);
      break;
    }
    if (i % 5 === 0) log('  ...waiting, current length: ' + text.length);
  }

  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig001-04-response.png'), fullPage: true });

  // Capture full state
  const finalState = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      bodyText: body,
      bodyLength: body.length,
      title: document.title,
      url: window.location.href,
    };
  });

  log('\n=== PAGE CONTENT (first 2000 chars) ===');
  console.log(finalState.bodyText.slice(0, 2000));

  // Analyze SSE chunks
  log('\n=== SSE ANALYSIS ===');
  log('Total chunks: ' + sseChunks.length);
  for (let i = 0; i < sseChunks.length; i++) {
    try {
      const obj = JSON.parse(sseChunks[i]);
      const type = obj.type;
      let summary = '';
      if (type === 'process_event') {
        const ev = obj.event;
        summary = ev.label || '';
        // Check for search/tool related events
        if (ev.type?.includes('tool') || ev.type?.includes('search') || ev.label?.includes('搜索') || ev.label?.includes('联网')) {
          summary = '*** ' + summary + ' ***';
        }
      } else if (type === 'runtime_state') summary = obj.runtime_state?.label || '';
      else if (type === 'content') summary = 'content: ' + (obj.content || '').slice(0, 80);
      else if (type === 'done') {
        summary = 'DONE result keys: ' + Object.keys(obj.result || {}).join(', ');
        const result = obj.result || {};
        if (result.answer) summary += '\n    answer: ' + result.answer.slice(0, 200);
        if (result.response_contract) summary += '\n    response_contract keys: ' + Object.keys(result.response_contract).join(', ');
        if (result.semantic_result) summary += '\n    semantic_result: ' + JSON.stringify(result.semantic_result).slice(0, 200);
        if (result.business_summary) summary += '\n    business_summary: ' + JSON.stringify(result.business_summary).slice(0, 200);
        if (result.workflow_result?.tool_calls) summary += '\n    tool_calls: ' + JSON.stringify(result.workflow_result.tool_calls).slice(0, 300);
      } else if (type === 'route') summary = 'route: ' + JSON.stringify(obj);
      else summary = JSON.stringify(obj).slice(0, 150);
      console.log('[' + i + '] type=' + type + ' | ' + summary);
    } catch(e) {
      console.log('[' + i + '] PARSE_ERROR: ' + sseChunks[i].slice(0, 100));
    }
  }

  // Check key indicators
  log('\n=== KEY INDICATORS ===');
  const bodyText = finalState.bodyText;

  // Check for "no search" phrases (round 1 failure pattern)
  const noSearchPhrases = ['没有联网', '无法联网', '不能联网', '没有搜索', '无法搜索', '不能搜索', '没有网络', '无法访问互联网', '抱歉，我'];
  let hasNoSearchPhrase = false;
  for (const phrase of noSearchPhrases) {
    if (bodyText.includes(phrase)) {
      log('FOUND NO-SEARCH PHRASE: "' + phrase + '"');
      hasNoSearchPhrase = true;
    }
  }
  if (!hasNoSearchPhrase) log('No "no search capability" phrases found ✓');

  // Check for weather-related content
  const weatherKeywords = ['南京', '天气', '温度', '气温', '℃', '°C', '度', '晴', '阴', '雨', '周日', '星期日', '风力', '湿度', '降水'];
  const foundWeatherKeywords = weatherKeywords.filter(k => bodyText.includes(k));
  log('Weather keywords found: ' + foundWeatherKeywords.join(', '));

  // Check for search tool invocations in SSE
  const searchRelatedChunks = sseChunks.filter(c => {
    try {
      const obj = JSON.parse(c);
      const text = JSON.stringify(obj);
      return text.includes('search') || text.includes('搜索') || text.includes('tool') || text.includes('public_web') || text.includes('web_search');
    } catch { return false; }
  });
  log('Search/tool related SSE chunks: ' + searchRelatedChunks.length);

  // Check if any tool was called
  const toolCallChunks = sseChunks.filter(c => {
    try {
      const obj = JSON.parse(c);
      return obj.type === 'process_event' && obj.event?.type?.includes('tool');
    } catch { return false; }
  });
  log('Tool call events in SSE: ' + toolCallChunks.length);
  for (const tc of toolCallChunks) {
    try {
      const ev = JSON.parse(tc).event;
      log('  Tool event: ' + ev.label + ' (' + ev.type + ')');
    } catch {}
  }

  // Network analysis
  log('\n=== NETWORK ANALYSIS ===');
  const chatReqs = networkEvents.filter(e => e.url.includes('/api/chat'));
  log('Chat API calls: ' + chatReqs.length);
  const httpErrors = networkEvents.filter(e => e.phase === 'res' && e.status >= 400);
  log('HTTP errors: ' + httpErrors.length);
  httpErrors.slice(0, 5).forEach(e => log('  ' + e.status + ' ' + e.url));

  const searchApiCalls = networkEvents.filter(e =>
    e.url.includes('search') || e.url.includes('web') || e.url.includes('fetch')
  );
  log('Search/fetch API calls: ' + searchApiCalls.length);
  searchApiCalls.slice(0, 10).forEach(e => log('  ' + e.phase + ' ' + e.url + (e.status ? ' ' + e.status : '')));

  log('\nConsole errors: ' + consoleLogs.filter(l => l.type === 'error').length);
  log('Page errors: ' + pageErrors.length);

  // Refresh test
  log('\n=== REFRESH TEST ===');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig001-05-refresh.png'), fullPage: true });

  const postRefresh = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    title: document.title,
  }));
  log('After refresh title: ' + postRefresh.title);
  log('User msg after refresh: ' + postRefresh.bodyText.includes(testInput));
  log('Content after refresh: ' + (postRefresh.bodyText.length > 100));
  log('Weather keywords after refresh: ' + weatherKeywords.filter(k => postRefresh.bodyText.includes(k)).join(', '));

  // Save full SSE data
  fs.writeFileSync(path.join(REPORT_DIR, 'mig001-sse-chunks.json'), JSON.stringify(sseChunks, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, 'mig001-report.json'), JSON.stringify({
    testCase: 'MIG-001', scenario: '天气', input: testInput, timestamp: new Date().toISOString(),
    results: {
      userMessageVisible, responseStable: stableCount >= 4,
      hasNoSearchPhrase, weatherKeywordsFound: foundWeatherKeywords,
      searchChunks: searchRelatedChunks.length, toolCallEvents: toolCallChunks.length,
      consoleErrors: consoleLogs.filter(l => l.type === 'error').length,
      pageErrors: pageErrors.length, httpErrors: httpErrors.length,
      userMsgAfterRefresh: postRefresh.bodyText.includes(testInput),
      contentAfterRefresh: postRefresh.bodyText.length > 100,
    },
    responsePreview: finalState.bodyText.slice(0, 2000),
  }, null, 2));

  // Summary
  log('\n╔══════════════════════════════════════╗');
  log('║     MIG-001 TEST SUMMARY             ║');
  log('╠══════════════════════════════════════╣');
  log(`║ Input: "${testInput}"`);
  log(`║ User msg immediate: ${userMsgVisible ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`║ No "no search" phrase: ${!hasNoSearchPhrase ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`║ Weather keywords:     ${foundWeatherKeywords.length > 0 ? 'PASS ✓' : 'FAIL ✗'} (${foundWeatherKeywords.length})`);
  log(`║ Search/tool chunks:   ${searchRelatedChunks.length > 0 ? 'PASS ✓' : 'FAIL ✗'} (${searchRelatedChunks.length})`);
  log(`║ Tool call events:     ${toolCallChunks.length > 0 ? 'PASS ✓' : 'FAIL ✗'} (${toolCallChunks.length})`);
  log(`║ Console errors:       ${consoleLogs.filter(l => l.type === 'error').length === 0 ? 'PASS ✓' : 'WARN'}`);
  log(`║ HTTP errors:          ${httpErrors.length === 0 ? 'PASS ✓' : 'WARN'} (${httpErrors.length})`);
  log(`║ Refresh preserved:    ${postRefresh.bodyText.includes(testInput) ? 'PASS ✓' : 'FAIL ✗'}`);
  log('╚══════════════════════════════════════╝');

  await context.close();
  log('Test complete.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
