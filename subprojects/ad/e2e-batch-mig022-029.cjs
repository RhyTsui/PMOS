const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TESTS = [
  { id: 'MIG-022', input: '指间山海 2026-03-25 日报中，广告投放部、巨量引擎、安卓应用类型的激活数、注册数、消耗和首日 ROI', kw: ['激活', '注册', '消耗', 'ROI'] },
  { id: 'MIG-023', input: '指间山海 2026-03-25 日报中，广告投放部按细分媒体 + 应用类型查看激活数和注册数', kw: ['媒体', '应用', '激活', '注册'] },
  { id: 'MIG-024', input: '指间山海 2026-03-25 日报中，广告投放部按细分媒体 + 团队查看激活数和 ROI', kw: ['媒体', '团队', '激活', 'ROI'] },
  { id: 'MIG-025', input: '指间山海 2026-03-25 日报中，按细分应用类型 + 团队查看激活数和首日 ROI', kw: ['应用', '团队', '激活', 'ROI'] },
  { id: 'MIG-026', input: '指间山海 2026-05-11~2026-05-17 中，广告投放部按媒体、应用类型细分的激活数', kw: ['媒体', '应用', '激活'] },
  { id: 'MIG-027', input: '指间山海 20260320-20260405 那一周周报中，广告投放部按细分媒体查看区间首周 ROI', kw: ['周报', '媒体', 'ROI'] },
  { id: 'MIG-028', input: '指间山海 20260320-20260405 那一周周报中，广告投放部按细分应用类型查看累计 ROI', kw: ['周报', '应用', 'ROI'] },
  { id: 'MIG-029', input: '指间山海 2026 年 2 月月报中，广告投放部按媒体、应用类型细分的 top3 的激活数', kw: ['月报', 'top3', '激活'] },
];

(async () => {
  log('=== BATCH: MIG-022 to MIG-029 (8 tests) ===');
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
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const t = await page.evaluate(() => document.body.innerText);
      if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
      else stableCount++;
      if (stableCount >= 4 && t.length > 100) { log('Stable ' + ((i+1)*2) + 's len=' + t.length); break; }
    }
    await sleep(1500);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const foundKw = test.kw.filter(k => bodyText.includes(k));
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || bodyText.includes('暂无数据') || foundKw.length >= 2;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer);
    results[test.id] = { keywords: foundKw, hasAnswer };
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'batch-mig022-029-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), tests: results }, null, 2));

  log('\n=== SUMMARY ===');
  for (const [id, r] of Object.entries(results)) {
    const pass = r.hasAnswer && r.keywords.length > 0;
    log(id + ': ' + (pass ? 'PASS ✓' : 'FAIL ✗'));
  }

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
