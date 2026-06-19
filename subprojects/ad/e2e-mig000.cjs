/**
 * E2E Test: MIG-000 - 连通性测试
 * Input: "你好"
 * Expected: LLM理解+简单回应
 *
 * Uses saved auth state from .auth-state/auth-tokens.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://10.236.14.27:8002';
const AUTH_FILE = path.join(__dirname, '.auth-state', 'auth-tokens.json');
const SCREENSHOTS_DIR = path.join(__dirname, '.test-screenshots');
const REPORT_DIR = path.join(__dirname, '.test-reports');

[SCREENSHOTS_DIR, REPORT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadAuth() {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error('Auth file not found: ' + AUTH_FILE + '\nRun e2e-login-helper.cjs first.');
  }
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
}

async function injectAuth(page, auth) {
  // Set cookies
  const cookies = (auth.cookies || []).map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain || '10.236.14.27',
    path: c.path || '/',
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: c.sameSite || 'Lax',
  }));
  if (cookies.length > 0) {
    await page.context().addCookies(cookies);
    log(`Injected ${cookies.length} cookies`);
  }

  // We'll set localStorage after navigating to the domain
}

async function setLocalStorage(page, auth) {
  await page.evaluate((data) => {
    if (data.token) localStorage.setItem('__YK_LOGIN_TOKEN__', data.token);
    if (data.sessionId) localStorage.setItem('__YK_LOGIN_SESSION_ID__', data.sessionId);
    if (data.token) localStorage.setItem('xiaoqiao_auth_token', data.token);
    if (data.sessionId) localStorage.setItem('xiaoqiao_auth_session', data.sessionId);
  }, auth.authData);
  log('localStorage set');
}

async function main() {
  log('========================================');
  log('E2E TEST: MIG-000 - 连通性测试');
  log('Input: "你好"');
  log('Expected: LLM理解+简单回应');
  log('========================================');

  const auth = loadAuth();
  log('Auth loaded, token length: ' + (auth.authData.token?.length || 0));

  // Launch browser
  const context = await chromium.launchPersistentContext(
    path.join(__dirname, '.auth-state', 'browser-context'),
    {
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--start-maximized'],
    }
  );

  const page = context.pages()[0] || await context.newPage();

  // Capture data
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
  });

  const networkEvents = [];
  const sseChunks = [];
  const apiResponses = [];

  page.on('request', req => {
    networkEvents.push({
      phase: 'request',
      method: req.method(),
      url: req.url(),
      ts: Date.now(),
    });
  });

  page.on('response', async resp => {
    const entry = {
      phase: 'response',
      status: resp.status(),
      url: resp.url(),
      ts: Date.now(),
    };
    networkEvents.push(entry);

    // Capture chat API responses
    if (resp.url().includes('/api/chat')) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('text/event-stream')) {
          // SSE - read body as text
          const body = await resp.text();
          entry.isSSE = true;
          entry.bodyLength = body.length;
          // Parse SSE chunks
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              sseChunks.push(line.slice(6));
            }
          }
          entry.sseChunkCount = sseChunks.length;
        } else {
          const body = await resp.text();
          entry.bodyLength = body.length;
          try {
            entry.json = JSON.parse(body);
          } catch {}
        }
        apiResponses.push(entry);
      } catch (e) {
        entry.bodyError = e.message;
        apiResponses.push(entry);
      }
    }
  });

  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push({ message: err.message, ts: Date.now() });
  });

  // Inject auth before navigating
  await injectAuth(page, auth);

  // Navigate to main page
  log('Navigating to ' + BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Set localStorage after page load
  await setLocalStorage(page, auth);

  // Check if we're on login page
  const currentUrl = page.url();
  log('URL after navigation: ' + currentUrl);

  if (currentUrl.includes('/login')) {
    log('ERROR: Still on login page. Auth state may be invalid.');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-login-fail.png'), fullPage: true });
    await context.close();
    process.exit(1);
  }

  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-01-main-page.png'), fullPage: true });
  log('Main page loaded successfully');

  // Find input area
  const inputSelectors = [
    'textarea',
    '[data-testid="chat-input"]',
    '.ant-input',
    '[role="textbox"]',
    'div[contenteditable="true"]',
    'input[type="text"]',
  ];

  let inputEl = null;
  let usedSelector = '';
  for (const sel of inputSelectors) {
    const el = await page.$(sel);
    if (el) {
      const isVisible = await el.isVisible();
      if (isVisible) {
        inputEl = el;
        usedSelector = sel;
        log(`Found input element: ${sel}`);
        break;
      }
    }
  }

  if (!inputEl) {
    log('ERROR: Could not find visible input element');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-no-input.png'), fullPage: true });
    const html = await page.content();
    log('Page HTML (first 1000): ' + html.slice(0, 1000));
    await context.close();
    process.exit(1);
  }

  // Record start time
  const testStartTime = Date.now();

  // Type the test input
  const testInput = '你好';
  log(`Typing: "${testInput}"`);
  await inputEl.click();
  await inputEl.fill(testInput);
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-02-typed.png'), fullPage: true });

  // Send message
  log('Sending message via Enter...');
  await page.keyboard.press('Enter');

  // PHASE 1: Check user message appears immediately
  await sleep(1000);
  const afterSendText = await page.evaluate(() => document.body.innerText);
  const userMsgImmediate = afterSendText.includes(testInput);
  log(`User message visible after 1s: ${userMsgImmediate}`);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-03-after-send.png'), fullPage: true });

  // PHASE 2: Check AI placeholder/loading appears
  await sleep(2000);
  const afterWaitText = await page.evaluate(() => document.body.innerText);
  log('Page text after 3s (first 500 chars): ' + afterWaitText.slice(0, 500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-04-loading.png'), fullPage: true });

  // PHASE 3: Wait for AI response (up to 60s)
  log('Waiting for AI response (up to 60s)...');
  let aiResponseText = '';
  let responseStable = false;
  let lastLen = 0;
  let stableCount = 0;

  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const currentText = await page.evaluate(() => document.body.innerText);
    const currentLen = currentText.length;

    if (currentLen !== lastLen) {
      lastLen = currentLen;
      stableCount = 0;
    } else {
      stableCount++;
    }

    if (stableCount >= 3 && currentLen > afterWaitText.length + 50) {
      aiResponseText = currentText;
      responseStable = true;
      log(`Response stable after ${(i + 1) * 2}s (len: ${currentLen})`);
      break;
    }
  }

  if (!responseStable) {
    aiResponseText = await page.evaluate(() => document.body.innerText);
    log(`Response may not be fully stable. Current length: ${aiResponseText.length}`);
  }

  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-05-final-response.png'), fullPage: true });

  // PHASE 4: Capture final state
  const finalState = await page.evaluate(() => {
    const body = document.body.innerText;
    const html = document.body.innerHTML;

    // Check for mojibake using string patterns (avoid regex with high-byte chars)
    const mojibakeFound = [];
    const replacementCount = (body.match() || []).length;
    if (replacementCount > 0) {
      mojibakeFound.push({ pattern: 'replacement_char', count: replacementCount });
    }
    // Check for common mojibake sequences by looking for specific known strings
    const mojibakeStrings = ['â€', 'Ã€', 'ï¼', 'ï¿½'];
    const mojibakeNames = ['latin1_mojibake', 'cjk_mojibake', 'fullwidth_mojibake', 'utf8_mojibake'];
    for (let mi = 0; mi < mojibakeStrings.length; mi++) {
      const idx = body.indexOf(mojibakeStrings[mi]);
      if (idx >= 0) {
        mojibakeFound.push({ pattern: mojibakeNames[mi], count: 1, sample: body.slice(idx, idx + 10) });
      }
    }

    // Get chat messages
    const messages = [];
    document.querySelectorAll('[class*="message"], [class*="chat"] > div, [role="article"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 1) messages.push(text.slice(0, 200));
    });

    return {
      bodyText: body,
      bodyLength: body.length,
      title: document.title,
      url: window.location.href,
      mojibakeFound,
      messageCount: messages.length,
      messages: messages.slice(0, 20),
    };
  });

  log('');
  log('=== FINAL STATE ===');
  log('URL: ' + finalState.url);
  log('Title: ' + finalState.title);
  log('Body length: ' + finalState.bodyLength);
  log('Message count: ' + finalState.messageCount);

  if (finalState.mojibakeFound.length > 0) {
    log('MOJIBAKE DETECTED:');
    finalState.mojibakeFound.forEach(m => {
      log(`  ${m.pattern}: ${m.count} occurrences, samples: ${JSON.stringify(m.samples)}`);
    });
  } else {
    log('No mojibake in DOM');
  }

  log('\n=== MESSAGES ===');
  finalState.messages.forEach((m, i) => {
    log(`[${i}] ${m.slice(0, 150)}`);
  });

  // PHASE 5: Check right panel / process disclosure
  log('\n=== RIGHT PANEL CHECK ===');
  const rightPanelInfo = await page.evaluate(() => {
    // Look for right panel / process disclosure elements
    const panelSelectors = [
      '[class*="right-panel"]',
      '[class*="sidebar"]',
      '[class*="disclosure"]',
      '[class*="process"]',
      '[class*="trace"]',
      '[class*="evidence"]',
      '[class*="source"]',
    ];

    const found = [];
    for (const sel of panelSelectors) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 5) {
          found.push({ selector: sel, text: text.slice(0, 300) });
        }
      });
    }
    return found;
  });

  if (rightPanelInfo.length > 0) {
    log(`Right panel elements found: ${rightPanelInfo.length}`);
    rightPanelInfo.slice(0, 5).forEach(p => {
      log(`  [${p.selector}] ${p.text.slice(0, 200)}`);
    });
  } else {
    log('No right panel content detected');
  }

  // PHASE 6: Network analysis
  log('\n=== NETWORK ANALYSIS ===');
  const chatReqs = networkEvents.filter(e => e.url.includes('/api/chat'));
  log(`Chat API requests: ${chatReqs.length}`);
  chatReqs.forEach((r, i) => {
    log(`  ${i}: ${r.phase} ${r.method || ''} ${r.url} status=${r.status || '-'}`);
  });

  const httpErrors = networkEvents.filter(e => e.phase === 'response' && e.status >= 400);
  log(`HTTP errors (4xx/5xx): ${httpErrors.length}`);
  httpErrors.slice(0, 10).forEach(r => {
    log(`  ${r.status} ${r.url}`);
  });

  log(`\nSSE chunks captured: ${sseChunks.length}`);

  // PHASE 7: API response analysis
  log('\n=== API RESPONSES ===');
  apiResponses.forEach((r, i) => {
    log(`Response ${i}: ${r.url} status=${r.status} len=${r.bodyLength || '-'}`);
    if (r.json) {
      const keys = Object.keys(r.json);
      log(`  JSON keys: ${keys.join(', ')}`);
      // Check key fields
      if (r.json.answer !== undefined) log(`  answer: ${String(r.json.answer).slice(0, 100)}`);
      if (r.json.message !== undefined) log(`  message: ${String(r.json.message).slice(0, 100)}`);
      if (r.json.trace !== undefined) log(`  trace: ${JSON.stringify(r.json.trace).slice(0, 200)}`);
    }
    if (r.isSSE) log(`  SSE: ${r.sseChunkCount} chunks`);
    if (r.bodyError) log(`  Error: ${r.bodyError}`);
  });

  // PHASE 8: Console errors
  log('\n=== CONSOLE ANALYSIS ===');
  log(`Total console messages: ${consoleLogs.length}`);
  const consoleErrors = consoleLogs.filter(l => l.type === 'error');
  log(`Console errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 10).forEach(e => {
    log(`  ERROR: ${e.text.slice(0, 200)}`);
  });

  // Page errors
  log(`\nPage errors: ${pageErrors.length}`);
  pageErrors.slice(0, 5).forEach(e => {
    log(`  ${e.message.slice(0, 200)}`);
  });

  // PHASE 9: Refresh / Replay test
  log('\n=== REFRESH/REPLAY TEST ===');
  const preRefreshBody = finalState.bodyText;
  const preRefreshTitle = finalState.title;

  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mig000-06-after-refresh.png'), fullPage: true });

  const postRefresh = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText,
      title: document.title,
      url: window.location.href,
    };
  });

  log('After refresh URL: ' + postRefresh.url);
  log('After refresh title: ' + postRefresh.title);
  log('Title preserved: ' + (postRefresh.title === preRefreshTitle || (preRefreshTitle && postRefresh.title)));

  const userMsgAfterRefresh = postRefresh.bodyText.includes(testInput);
  log('User message after refresh: ' + userMsgAfterRefresh);

  // Check if AI response is preserved
  const responsePreserved = postRefresh.bodyText.length > 500;
  log('Content preserved after refresh: ' + responsePreserved);

  log('\n=== POST-REFRESH BODY (first 1000) ===');
  log(postRefresh.bodyText.slice(0, 1000));

  // Check mojibake after refresh
  const postRefreshMojibake = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      hasReplacementChar: body.includes(''),
      hasMojibake: /â€|ã€|ï¼|ï¿/.test(body),
    };
  });
  log('Mojibake after refresh: ' + JSON.stringify(postRefreshMojibake));

  // Save full report
  const report = {
    testCase: 'MIG-000',
    scenario: '连通',
    input: testInput,
    expected: 'LLM理解+简单回应',
    timestamp: new Date().toISOString(),
    results: {
      userMessageImmediate: userMsgImmediate,
      aiResponsePresent: responseStable,
      mojibakeInDOM: finalState.mojibakeFound.length > 0,
      mojibakeDetails: finalState.mojibakeFound,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      httpErrors: httpErrors.length,
      chatApiCalls: chatReqs.length,
      sseChunks: sseChunks.length,
      userMessageAfterRefresh: userMsgAfterRefresh,
      contentAfterRefresh: responsePreserved,
      title: finalState.title,
      titleAfterRefresh: postRefresh.title,
    },
    messages: finalState.messages,
    apiResponses: apiResponses.map(r => ({
      url: r.url,
      status: r.status,
      bodyLength: r.bodyLength,
      isSSE: r.isSSE,
      sseChunkCount: r.sseChunkCount,
      jsonKeys: r.json ? Object.keys(r.json) : null,
      bodyError: r.bodyError,
    })),
  };

  const reportFile = path.join(REPORT_DIR, 'mig000-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`\nFull report saved to: ${reportFile}`);

  // Save network log
  fs.writeFileSync(path.join(REPORT_DIR, 'mig000-network.json'), JSON.stringify(networkEvents, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, 'mig000-console.json'), JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, 'mig000-page-errors.json'), JSON.stringify(pageErrors, null, 2));
  if (sseChunks.length > 0) {
    fs.writeFileSync(path.join(REPORT_DIR, 'mig000-sse-chunks.json'), JSON.stringify(sseChunks, null, 2));
  }

  // Final summary
  log('\n');
  log('╔══════════════════════════════════════╗');
  log('║     MIG-000 TEST SUMMARY             ║');
  log('╠══════════════════════════════════════╣');
  log(`║ Input: "${testInput}"`);
  log(`║ User msg immediate: ${userMsgImmediate ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`║ AI response:        ${responseStable ? 'PASS ✓' : 'UNCERTAIN'}`);
  log(`║ Mojibake in DOM:    ${finalState.mojibakeFound.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`║ Console errors:     ${consoleErrors.length === 0 ? 'PASS ✓' : 'WARN'} (${consoleErrors.length})`);
  log(`║ Page errors:        ${pageErrors.length === 0 ? 'PASS ✓' : 'WARN'} (${pageErrors.length})`);
  log(`║ HTTP errors:        ${httpErrors.length === 0 ? 'PASS ✓' : 'WARN'} (${httpErrors.length})`);
  log(`║ User msg refresh:   ${userMsgAfterRefresh ? 'PASS ✓' : 'FAIL ✗'}`);
  log(`║ Content refresh:    ${responsePreserved ? 'PASS ✓' : 'FAIL ✗'}`);
  log('╚══════════════════════════════════════╝');

  await context.close();
  log('Test complete.');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
