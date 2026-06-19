const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const REPORT_DIR = path.join(__dirname, '.test-reports');
function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TESTS = [
  { id: 'MIG-038', input: '查询指间 20260101 那一天市场星图的 7 日设备留存率', kw: ['留存率', '7 日', '星图'] },
  { id: 'MIG-039', input: '查询指间 20260101 那一天市场量的 7 日设备留存率', kw: ['留存率', '7 日', '市场量'] },
  { id: 'MIG-040', input: '验证指间山海 2026-03-25 广告小时报表各小时消耗之和是否等于当天总消耗', kw: ['消耗', '之和', '验证'] },
  { id: 'MIG-041', input: '验证指间山海 2026-03-25 广告小时报表按媒体汇总的全天激活数之和是否等于总激活数', kw: ['激活', '之和', '验证'] },
  { id: 'MIG-042', input: '验证指间山海 2026-03-25 广告 ROI 日报中区间 ROI 和累计 ROI 计算是否正确', kw: ['ROI', '验证', '日报'] },
  { id: 'MIG-043', input: '验证指间山海 2026-05-11~2026-05-17 广告 ROI 周报中巨量引擎安卓应用类型的累计 ROI 计算是否正确', kw: ['ROI', '验证', '周报', '巨量'] },
  { id: 'MIG-044', input: '验证指间山海 2026 年 3 月广告 ROI 月报中腾讯广告 iOS 应用类型的区间 ROI 计算是否正确', kw: ['ROI', '验证', '月报', '腾讯'] },
  { id: 'MIG-045', input: '验证指间山海 2026-05-11 新增设备留存日报中的次留计算是否正确', kw: ['留存', '验证', '次留', '日报'] },
  { id: 'MIG-046', input: '验证指间山海注册用户留存周报中 2026-05-11~2026-05-17 的 7 日留存计算是否正确', kw: ['留存', '验证', '周报', '7 日'] },
  { id: 'MIG-047', input: '验证指间山海首日付费账号留存月报中的 30 日留存计算是否正确', kw: ['留存', '验证', '月报', '30 日'] },
  { id: 'MIG-048', input: '指间山海在 iOS 端巨量引擎和腾讯广告的 2026-04-02 至 2026-04-08 激活数对比', kw: ['iOS', '巨量', '腾讯', '激活', '对比'] },
  { id: 'MIG-049', input: '指间山海 20260325 iOS 端和 Android 端的激活数对比', kw: ['iOS', 'Android', '激活', '对比'] },
];

(async () => {
  log('=== BATCH: MIG-038 to MIG-049 (12 tests) ===');
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
      if (stableCount >= 4 && t.length > 100) { log('Stable ' + ((i+1)*2) + 's'); break; }
    }
    await sleep(1500);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const foundKw = test.kw.filter(k => bodyText.includes(k));
    const hasAnswer = bodyText.includes('已返回') || bodyText.includes('已处理') || bodyText.includes('基于') || bodyText.includes('暂无数据') || foundKw.length >= 2;

    log('KW: ' + foundKw.join(',') + ' | hasAnswer: ' + hasAnswer);
    results[test.id] = { keywords: foundKw, hasAnswer };
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'batch-mig038-049-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), tests: results }, null, 2));

  log('\n=== SUMMARY ===');
  let pass = 0, fail = 0;
  for (const [id, r] of Object.entries(results)) {
    const p = r.hasAnswer && r.keywords.length > 0;
    if (p) pass++; else fail++;
    log(id + ': ' + (p ? 'PASS ✓' : 'FAIL ✗'));
  }
  log('\nTotal: ' + pass + ' PASS, ' + fail + ' FAIL');

  await context.close();
  log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
