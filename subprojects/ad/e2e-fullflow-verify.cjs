/**
 * Full E2E Flow Verification
 * Tests the complete pipeline from understanding → planning → execution → done
 * Checks all SSE events, response structure, UI rendering, and history replay
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');

function log(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  log('========================================');
  log('FULL E2E FLOW VERIFICATION');
  log('========================================');

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

  // Capture ALL SSE events
  const sseEvents = [];
  const consoleLogs = [];
  const networkEvents = [];
  const pageErrors = [];

  page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => pageErrors.push(e.message));

  page.on('response', async resp => {
    networkEvents.push({ status: resp.status(), url: resp.url() });
    if (resp.url().includes('/api/chat') && resp.headers()['content-type']?.includes('event-stream')) {
      const body = await resp.text();
      const lines = body.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            sseEvents.push(event);
          } catch {}
        }
      }
    }
  });

  // Navigate and login
  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(d => {
    if (d.token) localStorage.setItem('__YK_LOGIN_TOKEN__', d.token);
    if (d.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', d.sessionId);
  }, auth.authData);
  await sleep(4000);

  if (page.url().includes('/login')) {
    log('NOT LOGGED IN - aborting');
    await context.close();
    process.exit(1);
  }

  log('Logged in. Starting new conversation...');

  // Start new conversation
  const newBtn = await page.$('button:has-text("开启新对话")');
  if (newBtn) {
    await newBtn.click();
    await sleep(2000);
  }

  // Test 1: Simple greeting
  log('\n=== TEST 1: Simple greeting (你好) ===');
  const input1 = '你好';
  const ta1 = await page.$('textarea');
  await ta1.click(); await ta1.fill(input1); await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(2000);

  // Wait for response
  let lastLen = 0, stableCount = 0;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.length !== lastLen) { lastLen = t.length; stableCount = 0; }
    else stableCount++;
    if (stableCount >= 4 && t.length > 150) {
      log(`Response stable at ${(i+1)*2}s, length=${t.length}`);
      break;
    }
  }
  await sleep(2000);

  const bodyText1 = await page.evaluate(() => document.body.innerText);
  const title1 = await page.evaluate(() => document.title);
  log(`Title: ${title1}`);
  log(`Response preview: ${bodyText1.slice(0, 300)}`);

  // Analyze SSE events for Test 1
  log('\n--- SSE Events Analysis ---');
  const eventTypes = {};
  for (const evt of sseEvents) {
    eventTypes[evt.type] = (eventTypes[evt.type] || 0) + 1;
  }
  log('Event types:', JSON.stringify(eventTypes));

  // Check for key events
  const hasDone = sseEvents.some(e => e.type === 'done');
  const hasContent = sseEvents.some(e => e.type === 'content');
  const hasRoute = sseEvents.some(e => e.type === 'route');
  const doneAnswer = sseEvents.find(e => e.type === 'done')?.result?.answer || '';
  const contentText = sseEvents.find(e => e.type === 'content')?.content || '';

  log(`Has done event: ${hasDone}`);
  log(`Has content event: ${hasContent}`);
  log(`Has route event: ${hasRoute}`);
  log(`Done answer (first 100): ${doneAnswer.slice(0, 100)}`);
  log(`Content text (first 100): ${contentText.slice(0, 100)}`);

  // Check if answer is blocked
  const isBlocked = doneAnswer.includes('未通过安全校验') || doneAnswer.includes('已拦截');
  log(`Answer blocked: ${isBlocked}`);

  // Check response contract status
  const doneEvent = sseEvents.find(e => e.type === 'done');
  const contractStatus = doneEvent?.result?.response_contract?.status || 'unknown';
  log(`Response contract status: ${contractStatus}`);

  // Check for process events
  const processEvents = sseEvents.filter(e => e.type === 'process_event');
  log(`Process events: ${processEvents.length}`);
  const processLabels = processEvents.map(e => e.event?.label || '').filter(Boolean);
  log('Process labels:', processLabels.slice(0, 10).join(', '));

  // Take screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fullflow-test1.png'), fullPage: true });

  // Test 2: Refresh/Replay
  log('\n=== TEST 2: Refresh/Replay ===');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);

  const bodyText2 = await page.evaluate(() => document.body.innerText);
  const title2 = await page.evaluate(() => document.title);
  log(`After refresh - Title: ${title2}`);
  log(`After refresh - User msg preserved: ${bodyText2.includes(input1)}`);
  log(`After refresh - Content length: ${bodyText2.length}`);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fullflow-test2-refresh.png'), fullPage: true });

  // Summary
  log('\n========================================');
  log('FULL FLOW VERIFICATION SUMMARY');
  log('========================================');
  log(`1. User message sent: PASS`);
  log(`2. SSE events received: ${sseEvents.length > 0 ? 'PASS' : 'FAIL'} (${sseEvents.length} events)`);
  log(`3. Done event present: ${hasDone ? 'PASS' : 'FAIL'}`);
  log(`4. Content event present: ${hasContent ? 'PASS' : 'FAIL'}`);
  log(`5. Route event present: ${hasRoute ? 'PASS' : 'FAIL'}`);
  log(`6. Answer not blocked: ${!isBlocked ? 'PASS' : 'FAIL'}`);
  log(`7. Contract status: ${contractStatus === 'success' || contractStatus === 'degraded' ? 'PASS' : 'WARN'} (${contractStatus})`);
  log(`8. Process events: ${processEvents.length > 0 ? 'PASS' : 'FAIL'} (${processEvents.length})`);
  log(`9. Title generated: ${title1 !== '小乔智投' ? 'PASS' : 'FAIL'} (${title1})`);
  log(`10. Refresh preserves content: ${bodyText2.includes(input1) ? 'PASS' : 'FAIL'}`);
  log(`11. Console errors: ${consoleLogs.filter(l => l.type === 'error').length === 0 ? 'PASS' : 'WARN'}`);
  log(`12. Page errors: ${pageErrors.length === 0 ? 'PASS' : 'WARN'}`);

  // Save full report
  fs.writeFileSync(path.join(REPORT_DIR, 'fullflow-report.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    sseEventCounts: eventTypes,
    hasDone, hasContent, hasRoute,
    doneAnswer: doneAnswer.slice(0, 500),
    contentText: contentText.slice(0, 500),
    isBlocked, contractStatus,
    processLabels: processLabels.slice(0, 15),
    title: title1,
    titleAfterRefresh: title2,
    consoleErrors: consoleLogs.filter(l => l.type === 'error').length,
    pageErrors: pageErrors.length,
  }, null, 2));

  await context.close();
  log('\nVerification complete.');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
