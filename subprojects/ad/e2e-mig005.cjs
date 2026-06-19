const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  log('=== MIG-005: 系统知识问答 ===');
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
  const sseEvents = [], consoleLogs = [];
  page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('response', async resp => {
    if (resp.url().includes('/api/chat') && resp.headers()['content-type']?.includes('event-stream')) {
      const body = await resp.text();
      for (const line of body.split('\n')) {
        if (line.startsWith('data: ')) {
          try { sseEvents.push(JSON.parse(line.slice(6))); } catch {}
        }
      }
    }
  });

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);
  if (page.url().includes('/login')) { log('NOT_LOGGED_IN'); await context.close(); process.exit(1); }

  const newBtn = await page.$('button:has-text("开启新对话")');
  if (newBtn) { await newBtn.click(); await sleep(2000); }

  const input = '我们支持鸿蒙吗';
  const ta = await page.$('textarea');
  await ta.click(); await ta.fill(input); await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  log('User msg sent');

  let lastLen = 0, stableCount = 0;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
    else stableCount++;
    if (stableCount >= 4 && t.length > 150) { log('Stable at ' + ((i+1)*2) + 's, len=' + t.length); break; }
  }
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig005-response.png'), fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  log('\n=== RESPONSE (first 1000) ===');
  log(bodyText.slice(0, 1000));

  const kw = ['鸿蒙', 'HarmonyOS', '支持', '系统', '华为'];
  const foundKw = kw.filter(k => bodyText.includes(k));
  log('Keywords: ' + foundKw.join(', '));

  const hasDone = sseEvents.some(e => e.type === 'done');
  const doneAnswer = sseEvents.find(e => e.type === 'done')?.result?.answer || '';
  const contractStatus = sseEvents.find(e => e.type === 'done')?.result?.response_contract?.status || '';
  log('Has done: ' + hasDone);
  log('Done answer (first 100): ' + doneAnswer.slice(0, 100));
  log('Contract status: ' + contractStatus);

  const postTitle = await page.evaluate(() => document.title);
  log('Title: ' + postTitle);

  // Refresh test
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  const postText = await page.evaluate(() => document.body.innerText);
  log('Refresh: preserved=' + postText.includes('鸿蒙'));

  fs.writeFileSync(path.join(REPORT_DIR, 'mig005-report.json'), JSON.stringify({
    testCase: 'MIG-005', input, timestamp: new Date().toISOString(),
    results: { stable: stableCount >= 4, keywords: foundKw, hasDone, contractStatus, title: postTitle,
      refreshOk: postText.includes('鸿蒙'), sseCount: sseEvents.length,
      consoleErrs: consoleLogs.filter(l => l.type === 'error').length },
    responsePreview: bodyText.slice(0, 1000),
  }, null, 2));

  log('\n=== SUMMARY ===');
  log('Done event: ' + (hasDone ? 'PASS' : 'FAIL'));
  log('Not blocked: ' + (!doneAnswer.includes('拦截') ? 'PASS' : 'FAIL'));
  log('Refresh: ' + (postText.includes('鸿蒙') ? 'PASS' : 'FAIL'));

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
