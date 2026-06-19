const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  log('=== MIG-004: 行业知识问答 ===');
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
  page.on('console', m => { if (m.type() === 'error') console.log('Console ERR:', m.text()); });

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);
  if (page.url().includes('/login')) { log('NOT_LOGGED_IN'); await context.close(); process.exit(1); }

  const newBtn = await page.$('button:has-text("开启新对话")');
  if (newBtn) { await newBtn.click(); await sleep(2000); }

  const input = '腾讯iOS要接sdk吗';
  const ta = await page.$('textarea');
  await ta.click(); await ta.fill(input); await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  log('User msg sent');

  let lastLen = 0, stableCount = 0, finalLen = 0;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => document.body.innerText);
    finalLen = t.length;
    if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
    else stableCount++;
    if (stableCount >= 4 && t.length > 150) { log('Stable at ' + ((i+1)*2) + 's, len=' + t.length); break; }
    if (i % 5 === 0) log('  waiting... len=' + t.length);
  }
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig004-response.png'), fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  log('\n=== RESPONSE (first 1500) ===');
  log(bodyText.slice(0, 1500));

  const kw = ['腾讯', 'iOS', 'SDK', '接入', '接', '苹果'];
  const foundKw = kw.filter(k => bodyText.includes(k));
  log('Keywords: ' + foundKw.join(', '));

  const hasPlanning = bodyText.includes('进入候选规划阶段');
  const hasDone = bodyText.includes('已返回') || bodyText.includes('已处理');
  log('Stuck at planning: ' + hasPlanning + ', Has done indicator: ' + hasDone);

  const postTitle = await page.evaluate(() => document.title);
  log('Title: ' + postTitle);

  fs.writeFileSync(path.join(REPORT_DIR, 'mig004-report.json'), JSON.stringify({
    testCase: 'MIG-004', input, timestamp: new Date().toISOString(),
    results: { stable: stableCount >= 4, keywords: foundKw, stuckAtPlanning: hasPlanning, hasDone: hasDone, title: postTitle, finalLen },
    responsePreview: bodyText.slice(0, 1500),
  }, null, 2));

  log('\n=== SUMMARY ===');
  log('Keywords: ' + (foundKw.length > 0 ? 'PASS' : 'FAIL'));
  log('Not stuck: ' + (!hasPlanning || hasDone ? 'PASS' : 'FAIL'));

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
