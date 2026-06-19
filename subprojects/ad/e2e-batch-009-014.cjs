const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TESTS = [
  { id: 'MIG-009', input: '看下近 7 天的日报数据', kw: ['日报', '数据', '7 天'] },
  { id: 'MIG-010', input: '巨量 iOS 创新的投放效果，带自然量', kw: ['巨量', 'iOS', '投放', '自然量'] },
  { id: 'MIG-011', input: '查一下直播包的数据', kw: ['直播', '数据'] },
  { id: 'MIG-012', input: '三国杀小游戏 鸿蒙端的数据', kw: ['三国杀', '鸿蒙', '数据'] },
  { id: 'MIG-013', input: '查询近 7 日数据', kw: ['7 日', '数据', '查询'] },
  { id: 'MIG-014', input: '查询近 30 日趋势、分日', kw: ['30 日', '趋势', '分日'] },
];

(async () => {
  log('=== BATCH TEST: MIG-009 to MIG-014 (UI only) ===');
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

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);

  const results = {};

  for (const test of TESTS) {
    log('\n--- ' + test.id + ': ' + test.input + ' ---');
    const newBtn = await page.$('button:has-text("开启新对话")');
    if (newBtn) { await newBtn.click(); await sleep(3000); }

    await page.waitForSelector('textarea', { timeout: 10000 }).catch(() => null);
    const ta = await page.$('textarea');
    if (!ta) { log('ERROR: no textarea'); results[test.id] = { error: 'no textarea' }; continue; }
    await ta.click(); await ta.fill(test.input); await sleep(300);
    await page.keyboard.press('Enter');
    await sleep(1500);

    let lastLen = 0, stableCount = 0;
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const t = await page.evaluate(() => document.body.innerText);
      if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
      else stableCount++;
      if (stableCount >= 4 && t.length > 100) { log('Stable ' + ((i+1)*2) + 's len=' + t.length); break; }
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, test.id.toLowerCase() + '-ui.png'), fullPage: true });

    const bodyText = await page.evaluate(() => document.body.innerText);
    const foundKw = test.kw.filter(k => bodyText.includes(k));
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || foundKw.length >= 2;
    const notStuck = !bodyText.includes('进入候选规划阶段') || hasAnswer;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer + ' | notStuck: ' + notStuck);
    log('Preview: ' + bodyText.slice(bodyText.indexOf(test.input), bodyText.indexOf(test.input) + 200));

    results[test.id] = { input: test.input, keywords: foundKw, hasAnswer, notStuck };
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'batch-009-014-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), tests: results }, null, 2));

  log('\n=== SUMMARY ===');
  for (const [id, r] of Object.entries(results)) {
    const pass = r.hasAnswer && r.notStuck && r.keywords.length > 0;
    log(id + ': ' + (pass ? 'PASS ✓' : 'FAIL ✗'));
  }

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
