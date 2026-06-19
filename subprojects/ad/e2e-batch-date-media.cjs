const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TESTS = [
  { id: 'DATE-F003', input: '指间山海二月同期广告投放部的累计 ROI 和合计第 2 日 ROI', kw: ['ROI', '二月', '同期'] },
  { id: 'DATE-F004', input: '指间山海 2026-05-21 广告小时报表中，广告投放部 9 点 -10 点的激活数和折后消耗', kw: ['激活', '消耗', '小时', '9 点'] },
  { id: 'DATE-F005', input: '指间山海二月同期广告投放部的累计 ROI 和合计第 2 日 ROI', kw: ['ROI', '二月'] },
  { id: 'MEDIA-001', input: '指间山海在巨量引擎 2026-05-11~2026-05-17 的激活数', kw: ['巨量', '激活', '5 月'] },
  { id: 'MEDIA-004', input: '指间山海在 2026-05-11~2026-05-17 每日的巨量引擎和苹果广告的折后消耗对比', kw: ['巨量', '苹果', '消耗', '对比'] },
];

(async () => {
  log('=== BATCH: DATE-F003~F005 + MEDIA-001/004 ===');
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
    log('\n--- ' + test.id + ' ---');
    const newBtn = await page.$('button:has-text("开启新对话")');
    if (newBtn) { await newBtn.click(); await sleep(3000); }

    await page.waitForSelector('textarea', { timeout: 10000 }).catch(() => null);
    const ta = await page.$('textarea');
    if (!ta) { results[test.id] = { error: 'no textarea' }; continue; }
    await ta.click(); await ta.fill(test.input); await sleep(300);
    await page.keyboard.press('Enter');
    await sleep(1500);

    let lastLen = 0, stableCount = 0;
    for (let i = 0; i < 25; i++) {
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
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || bodyText.includes('暂无数据') || foundKw.length >= 2;
    const notStuck = !bodyText.includes('进入候选规划阶段') || hasAnswer;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer);
    results[test.id] = { keywords: foundKw, hasAnswer, notStuck };
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'batch-date-media-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), tests: results }, null, 2));

  log('\n=== SUMMARY ===');
  for (const [id, r] of Object.entries(results)) {
    const pass = r.hasAnswer && r.notStuck && r.keywords.length > 0;
    log(id + ': ' + (pass ? 'PASS ✓' : 'FAIL ✗'));
  }

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
