const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  log('=== MIG-003: 行业文档解读 ===');
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

  const consoleLogs = [], pageErrors = [];
  page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);
  if (page.url().includes('/login')) { log('NOT_LOGGED_IN'); await context.close(); process.exit(1); }

  const newBtn = await page.$('button:has-text("开启新对话")');
  if (newBtn) { await newBtn.click(); await sleep(2000); }

  const input = 'https://open.oceanengine.com/labels/7 监测回传文档在哪';
  const ta = await page.$('textarea');
  await ta.click(); await ta.fill(input); await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(1500);
  const userMsgOk = (await page.evaluate(() => document.body.innerText)).includes('监测回传文档');
  log('User msg: ' + userMsgOk);

  let lastLen = 0, stableCount = 0;
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
    else stableCount++;
    if (stableCount >= 4 && t.length > 200) { log('Stable at ' + ((i+1)*2) + 's, len=' + t.length); break; }
  }
  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig003-response.png'), fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  log('\n=== RESPONSE (first 2000) ===');
  log(bodyText.slice(0, 2000));

  const kw = ['文档', '回传', '监测', 'oceanengine', '巨量', 'SDK', 'API', '接入'];
  const foundKw = kw.filter(k => bodyText.includes(k));
  log('\nKeywords: ' + foundKw.join(', '));

  const noSearch = ['没有联网', '无法联网', '不知道这个', '无法访问'].some(p => bodyText.includes(p));
  log('No-answer phrases: ' + noSearch);

  const postTitle = await page.evaluate(() => document.title);
  log('Title: ' + postTitle);

  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  const postText = await page.evaluate(() => document.body.innerText);
  log('Refresh: input_preserved=' + postText.includes('监测回传') + ', title=' + (await page.evaluate(() => document.title)));

  log('Console errors: ' + consoleLogs.filter(l => l.type === 'error').length);
  log('Page errors: ' + pageErrors.length);

  fs.writeFileSync(path.join(REPORT_DIR, 'mig003-report.json'), JSON.stringify({
    testCase: 'MIG-003', input, timestamp: new Date().toISOString(),
    results: { userMsgOk, stable: stableCount >= 4, keywords: foundKw, noSearch, title: postTitle,
      refreshOk: postText.includes('监测回传'), consoleErrs: consoleLogs.filter(l => l.type === 'error').length },
    responsePreview: bodyText.slice(0, 2000),
  }, null, 2));

  log('\n=== SUMMARY ===');
  log('User msg: ' + (userMsgOk ? 'PASS' : 'FAIL'));
  log('Keywords: ' + (foundKw.length > 0 ? 'PASS(' + foundKw.length + ')' : 'FAIL'));
  log('No-answer: ' + (!noSearch ? 'PASS' : 'FAIL'));
  log('Refresh: ' + (postText.includes('监测回传') ? 'PASS' : 'FAIL'));

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
