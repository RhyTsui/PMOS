const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  log('=== MIG-002: 新闻解读 - 最近有哪些游戏上线 ===');
  const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, '.auth-state', 'browser-context'),
    { headless: false, viewport: { width: 1440, height: 900 } }
  );
  const page = context.pages()[0] || await context.newPage();
  await context.addCookies((auth.cookies || []).map(c => ({
    name: c.name, value: c.value, domain: c.domain || '10.236.14.27',
    path: c.path || '/', httpOnly: c.httpOnly || false,
    secure: c.secure || false, sameSite: c.sameSite || 'Lax',
  })));

  const consoleLogs = [], pageErrors = [], networkEvents = [], sseChunks = [];
  page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('response', async resp => {
    networkEvents.push({ status: resp.status(), url: resp.url() });
    if (resp.url().includes('/api/chat') && resp.headers()['content-type']?.includes('event-stream')) {
      const body = await resp.text();
      for (const line of body.split('\n')) if (line.startsWith('data: ')) sseChunks.push(line.slice(6));
    }
  });

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);

  if (page.url().includes('/login')) { log('NOT_LOGGED_IN'); await context.close(); process.exit(1); }

  // New conversation
  const newBtn = await page.$('button:has-text("开启新对话")');
  if (newBtn) { await newBtn.click(); await sleep(2000); }

  const input = '最近有哪些游戏上线';
  const ta = await page.$('textarea');
  await ta.click(); await ta.fill(input); await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  const userMsgOk = (await page.evaluate(() => document.body.innerText)).includes(input);
  log('User msg: ' + userMsgOk);

  // Wait for response
  let lastLen = 0, stableCount = 0;
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
    else stableCount++;
    if (stableCount >= 4 && t.length > 200) { log('Stable at ' + ((i+1)*2) + 's, len=' + t.length); break; }
  }
  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig002-response.png'), fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  log('\n=== RESPONSE (first 1500) ===');
  log(bodyText.slice(0, 1500));

  // Check indicators
  const gameKeywords = ['游戏', '上线', '发布', '公测', '手游', '端游', 'Steam', '苹果', '安卓', 'iOS', 'Android'];
  const foundKw = gameKeywords.filter(k => bodyText.includes(k));
  log('\nGame keywords: ' + foundKw.join(', '));

  const noSearchPhrases = ['没有联网', '无法联网', '不能联网', '没有搜索'];
  const hasNoSearch = noSearchPhrases.some(p => bodyText.includes(p));
  log('No-search phrases: ' + hasNoSearch);

  // SSE analysis
  let routeInfo = '', searchEvents = 0;
  for (const chunk of sseChunks) {
    try {
      const obj = JSON.parse(chunk);
      if (obj.type === 'route') routeInfo = JSON.stringify(obj);
      if (obj.type === 'process_event' && (obj.event?.label?.includes('搜索') || obj.event?.type?.includes('tool'))) searchEvents++;
    } catch {}
  }
  log('SSE chunks: ' + sseChunks.length + ', route: ' + routeInfo.slice(0, 200) + ', search events: ' + searchEvents);

  // Refresh
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  const postText = await page.evaluate(() => document.body.innerText);
  const postTitle = await page.evaluate(() => document.title);
  log('\nRefresh: title=' + postTitle + ', input_preserved=' + postText.includes(input) + ', keywords=' + gameKeywords.filter(k => postText.includes(k)).join(','));

  // Console/HTTP
  const errs = consoleLogs.filter(l => l.type === 'error');
  const httpErrs = networkEvents.filter(e => e.status >= 400);
  log('Console errors: ' + errs.length + ', HTTP errors: ' + httpErrs.length);

  fs.writeFileSync(path.join(REPORT_DIR, 'mig002-report.json'), JSON.stringify({
    testCase: 'MIG-002', input, timestamp: new Date().toISOString(),
    results: { userMsgOk, stable: stableCount >= 4, hasNoSearch, gameKeywords: foundKw,
      searchEvents, sseChunks: sseChunks.length, consoleErrs: errs.length, httpErrs: httpErrs.length,
      refreshOk: postText.includes(input), title: postTitle },
    responsePreview: bodyText.slice(0, 2000),
  }, null, 2));

  log('\n=== SUMMARY ===');
  log('User msg: ' + (userMsgOk ? 'PASS' : 'FAIL'));
  log('No-search phrases: ' + (!hasNoSearch ? 'PASS' : 'FAIL'));
  log('Game keywords: ' + (foundKw.length > 0 ? 'PASS(' + foundKw.length + ')' : 'FAIL'));
  log('Search events: ' + (searchEvents > 0 ? 'PASS' : 'FAIL'));
  log('Refresh: ' + (postText.includes(input) ? 'PASS' : 'FAIL'));
  log('Console: ' + (errs.length === 0 ? 'PASS' : 'WARN'));
  log('HTTP: ' + (httpErrs.length === 0 ? 'PASS' : 'WARN'));

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
