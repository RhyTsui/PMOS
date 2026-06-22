import { chromium } from 'playwright';
import path from 'node:path';

const USER_DATA_DIR = path.resolve('.auth/pw-data');
const BASE_URL = 'http://10.236.14.27:8002';

async function main() {
  console.log('[LOGIN] 启动持久化浏览器（请 Alt+Tab 找 Chromium 窗口）...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    locale: 'zh-CN',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('[LOGIN] 导航到首页...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const url = page.url();
  console.log(`[LOGIN] 当前 URL: ${url}`);

  if (url.includes('/login')) {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  请在弹出的浏览器窗口中扫码登录            ║');
    console.log('║  （Alt+Tab 切换到 Chromium 窗口）           ║');
    console.log('║  最长等待 5 分钟                             ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    const startTime = Date.now();
    while (Date.now() - startTime < 300_000) {
      await page.waitForTimeout(2000);
      try {
        const curUrl = page.url();
        if (!curUrl.includes('/login')) {
          console.log(`[LOGIN] 跳转检测到: ${curUrl}`);
          break;
        }
      } catch { /* navigating */ }
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 30 === 0 && elapsed > 0) {
        console.log(`[LOGIN] 等待扫码... ${elapsed}s / 300s`);
      }
    }

    if (page.url().includes('/login')) {
      console.log('[LOGIN] 超时！');
      await context.close();
      process.exit(1);
    }
  }

  console.log('[LOGIN] 登录成功！等待页面加载...');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '.auth/login-verified.png', fullPage: true });
  console.log('[LOGIN] 验证截图已保存到 .auth/login-verified.png');

  // Now run all E2E test cases through the persistent context
  console.log('');
  console.log('========== 开始 E2E 测试 ==========');
  console.log('');

  const results = [];

  // Helper functions
  async function findInput(p) {
    const selectors = [
      'textarea[data-testid="chat-input"]',
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="问"]',
      'textarea',
    ];
    for (const sel of selectors) {
      const el = p.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) return el;
    }
    return null;
  }

  async function sendMessage(p, msg) {
    const input = await findInput(p);
    if (!input) throw new Error('未找到消息输入框');
    await input.click();
    await input.fill(msg);
    await p.waitForTimeout(200);
    const sendBtns = [
      'button[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[title*="发送"]',
      'button[type="submit"]',
    ];
    for (const sel of sendBtns) {
      const btn = p.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        return;
      }
    }
    await input.press('Enter');
  }

  async function waitForResponse(p, timeoutMs = 120000) {
    const start = Date.now();
    let lastText = '';
    let stableCount = 0;
    while (Date.now() - start < timeoutMs) {
      const text = await p.evaluate(() => {
        const main = document.querySelector('[class*="chat-container"]')
          || document.querySelector('[class*="ChatContainer"]')
          || document.querySelector('main')
          || document.body;
        return (main.innerText || '').slice(0, 5000);
      }).catch(() => '');
      if (text.length > 100 && text !== lastText) {
        lastText = text;
        stableCount = 0;
      } else if (text === lastText && text.length > 100) {
        stableCount++;
        if (stableCount >= 4) return text;
      }
      await p.waitForTimeout(1000);
    }
    return lastText || '(无回复)';
  }

  async function startNewConversation(p) {
    const btns = [
      'button:has-text("新建对话")',
      'button:has-text("新对话")',
      'button:has-text("新建")',
      'button[aria-label*="新"]',
    ];
    for (const sel of btns) {
      const btn = p.locator(sel).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await p.waitForTimeout(500);
        return;
      }
    }
  }

  // ===== TEST CASES =====

  // Test 1: 基础对话 - 问候
  try {
    console.log('[RUN] E2E-001: 基础问候对话');
    await startNewConversation(page);
    await sendMessage(page, '你好，请简单介绍一下你自己');
    const reply = await waitForResponse(page);
    const pass = reply.length > 10 && !reply.includes('(无回复)');
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-001: 回复长度=${reply.length}, 前100字: ${reply.slice(0, 100)}`);
    results.push({ id: 'E2E-001', name: '基础问候对话', pass, detail: `回复长度=${reply.length}`, reply: reply.slice(0, 200) });
  } catch (e) {
    console.log(`[FAIL] E2E-001: ${e.message}`);
    results.push({ id: 'E2E-001', name: '基础问候对话', pass: false, detail: e.message });
  }

  // Test 2: 天气查询
  try {
    console.log('[RUN] E2E-002: 天气查询');
    await startNewConversation(page);
    await page.waitForTimeout(1000);
    await sendMessage(page, '南京今天天气怎么样？');
    const reply = await waitForResponse(page);
    const hasContent = reply.length > 20;
    const noInternalLeak = !/routeDecision|semanticFrame|query_contract|trace_id/i.test(reply);
    const pass = hasContent && noInternalLeak;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-002: 长度=${reply.length}, 无泄露=${noInternalLeak}`);
    results.push({ id: 'E2E-002', name: '天气查询', pass, detail: `长度=${reply.length}, 内部泄露=${!noInternalLeak}`, reply: reply.slice(0, 200) });
  } catch (e) {
    console.log(`[FAIL] E2E-002: ${e.message}`);
    results.push({ id: 'E2E-002', name: '天气查询', pass: false, detail: e.message });
  }

  // Test 3: 知识库查询 - 小乔智投
  try {
    console.log('[RUN] E2E-003: 知识库查询');
    await startNewConversation(page);
    await page.waitForTimeout(1000);
    await sendMessage(page, '请问小乔智投是什么？能做什么？');
    const reply = await waitForResponse(page);
    const hasContent = reply.length > 20;
    const pass = hasContent;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-003: 长度=${reply.length}`);
    results.push({ id: 'E2E-003', name: '知识库查询', pass, detail: `长度=${reply.length}`, reply: reply.slice(0, 200) });
  } catch (e) {
    console.log(`[FAIL] E2E-003: ${e.message}`);
    results.push({ id: 'E2E-003', name: '知识库查询', pass: false, detail: e.message });
  }

  // Test 4: 内部字段泄露检查
  try {
    console.log('[RUN] E2E-004: 内部字段泄露检查');
    const leakPatterns = [
      /routeDecision/i, /semanticFrame/i, /query_contract/,
      /slot_validation/, /trace_id[:=]/i, /message_id[:=]/i,
      /business_summary/, /answer_markdown/, /__proto__/,
      /contract/i, /mock/i,
    ];
    const pageText = await page.evaluate(() => document.body.innerText || '');
    const foundLeaks = leakPatterns.filter(re => re.test(pageText));
    const pass = foundLeaks.length === 0;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-004: 泄露模式=${foundLeaks.length === 0 ? '无' : foundLeaks.map(r => r.source)}`);
    results.push({ id: 'E2E-004', name: '内部字段泄露检查', pass, detail: foundLeaks.length === 0 ? '无泄露' : `泄露: ${foundLeaks.map(r => r.source).join(', ')}` });
  } catch (e) {
    console.log(`[FAIL] E2E-004: ${e.message}`);
    results.push({ id: 'E2E-004', name: '内部字段泄露检查', pass: false, detail: e.message });
  }

  // Test 5: 页面刷新后历史回放
  try {
    console.log('[RUN] E2E-005: 页面刷新后历史回放');
    const preUrl = page.url();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
    const postUrl = page.url();
    const hasContent = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return (main.innerText || '').length > 50;
    });
    const pass = hasContent && !postUrl.includes('/login');
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-005: 刷新后URL=${postUrl}, 有内容=${hasContent}`);
    results.push({ id: 'E2E-005', name: '页面刷新后历史回放', pass, detail: `URL=${postUrl}, 内容=${hasContent}` });
  } catch (e) {
    console.log(`[FAIL] E2E-005: ${e.message}`);
    results.push({ id: 'E2E-005', name: '页面刷新后历史回放', pass: false, detail: e.message });
  }

  // Test 6: 控制台错误检查
  try {
    console.log('[RUN] E2E-006: 浏览器控制台错误检查');
    const consoleErrors = await page.evaluate(() => {
      return window.__consoleErrors || [];
    });
    const pass = consoleErrors.length === 0;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-006: 控制台错误数=${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      for (const err of consoleErrors.slice(0, 5)) {
        console.log(`  [err] ${err.slice(0, 200)}`);
      }
    }
    results.push({ id: 'E2E-006', name: '浏览器控制台错误检查', pass, detail: `错误数=${consoleErrors.length}`, errors: consoleErrors.slice(0, 10) });
  } catch (e) {
    console.log(`[FAIL] E2E-006: ${e.message}`);
    results.push({ id: 'E2E-006', name: '浏览器控制台错误检查', pass: false, detail: e.message });
  }

  // Test 7: 侧边栏交互 - 会话列表
  try {
    console.log('[RUN] E2E-007: 侧边栏会话列表');
    const sidebarState = await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="sidebar"]')
        || document.querySelector('[class*="Sidebar"]')
        || document.querySelector('[class*="conversation-list"]')
        || document.querySelector('aside')
        || document.querySelector('nav');
      if (!sidebar) return { found: false, text: '' };
      return { found: true, text: (sidebar.innerText || '').slice(0, 500) };
    });
    const pass = sidebarState.found && sidebarState.text.length > 5;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-007: 侧边栏=${sidebarState.found}, 内容长度=${sidebarState.text.length}`);
    results.push({ id: 'E2E-007', name: '侧边栏会话列表', pass, detail: `found=${sidebarState.found}, text=${sidebarState.text.length}` });
  } catch (e) {
    console.log(`[FAIL] E2E-007: ${e.message}`);
    results.push({ id: 'E2E-007', name: '侧边栏会话列表', pass: false, detail: e.message });
  }

  // Test 8: 输入框可交互
  try {
    console.log('[RUN] E2E-008: 输入框可交互性');
    const input = await findInput(page);
    const pass = input !== null;
    if (pass) {
      await input.click();
      await input.fill('测试输入');
      const val = await input.inputValue();
      await input.fill('');
      const passFill = val === '测试输入';
      console.log(`[${passFill ? 'PASS' : 'FAIL'}] E2E-008: 输入填充=${passFill}`);
      results.push({ id: 'E2E-008', name: '输入框可交互性', pass: passFill, detail: `fill_test=${passFill}` });
    } else {
      console.log('[FAIL] E2E-008: 未找到输入框');
      results.push({ id: 'E2E-008', name: '输入框可交互性', pass: false, detail: '输入框未找到' });
    }
  } catch (e) {
    console.log(`[FAIL] E2E-008: ${e.message}`);
    results.push({ id: 'E2E-008', name: '输入框可交互性', pass: false, detail: e.message });
  }

  // ===== API-level E2E Tests =====
  console.log('');
  console.log('========== API 级 E2E 测试 ==========');

  // Test 9: /api/chat POST 响应
  try {
    console.log('[RUN] E2E-009: /api/chat SSE 响应');
    const apiResult = await page.evaluate(async () => {
      const start = Date.now();
      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-conversation-id': `e2e-test-009-${Date.now()}`,
            'x-pathname': '/e2e-test',
          },
          body: JSON.stringify({
            message: '你好，这是一条测试消息',
            intent: 'general_chat',
            history: [],
            metadata: {},
          }),
          signal: AbortSignal.timeout(60000),
        });
        const text = await resp.text();
        return {
          status: resp.status,
          ok: resp.ok,
          hasContent: text.length > 0,
          hasSSE: text.includes('data:'),
          hasDone: text.includes('"type":"done"') || text.includes('type: "done"'),
          responseTime: Date.now() - start,
          preview: text.slice(0, 300),
        };
      } catch (e) {
        return { error: e.message, responseTime: Date.now() - start };
      }
    });
    const pass = apiResult.ok && apiResult.hasSSE && !apiResult.error;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-009: status=${apiResult.status}, SSE=${apiResult.hasSSE}, done=${apiResult.hasDone}, time=${apiResult.responseTime}ms`);
    if (apiResult.error) console.log(`  [error] ${apiResult.error}`);
    results.push({ id: 'E2E-009', name: '/api/chat SSE 响应', pass, detail: JSON.stringify(apiResult) });
  } catch (e) {
    console.log(`[FAIL] E2E-009: ${e.message}`);
    results.push({ id: 'E2E-009', name: '/api/chat SSE 响应', pass: false, detail: e.message });
  }

  // Test 10: BFF API - /api/xiaoqiao/conversations
  try {
    console.log('[RUN] E2E-010: BFF 会话列表 API');
    const convResult = await page.evaluate(async () => {
      try {
        const resp = await fetch('/api/xiaoqiao/conversations');
        const json = await resp.json();
        return {
          status: resp.status,
          ok: resp.ok,
          isArray: Array.isArray(json),
          count: Array.isArray(json) ? json.length : 0,
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    const pass = convResult.ok && !convResult.error;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-010: status=${convResult.status}, isArray=${convResult.isArray}, count=${convResult.count}`);
    results.push({ id: 'E2E-010', name: 'BFF 会话列表 API', pass, detail: JSON.stringify(convResult) });
  } catch (e) {
    console.log(`[FAIL] E2E-010: ${e.message}`);
    results.push({ id: 'E2E-010', name: 'BFF 会话列表 API', pass: false, detail: e.message });
  }

  // Test 11: BFF API - /api/xiaoqiao/memory
  try {
    console.log('[RUN] E2E-011: BFF Memory API');
    const memResult = await page.evaluate(async () => {
      try {
        const resp = await fetch('/api/xiaoqiao/memory');
        const json = await resp.json();
        return {
          status: resp.status,
          ok: resp.ok,
          hasData: json !== null,
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    const pass = memResult.ok && !memResult.error;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-011: status=${memResult.status}`);
    results.push({ id: 'E2E-011', name: 'BFF Memory API', pass, detail: JSON.stringify(memResult) });
  } catch (e) {
    console.log(`[FAIL] E2E-011: ${e.message}`);
    results.push({ id: 'E2E-011', name: 'BFF Memory API', pass: false, detail: e.message });
  }

  // Test 12: 页面标题
  try {
    console.log('[RUN] E2E-012: 页面标题检查');
    const title = await page.title();
    const issues = [
      !title || title.length < 2 ? '空标题' : null,
      /routeDecision|semanticFrame|trace_id|undefined/i.test(title) ? '内部字段标题' : null,
      /[\u951F\u65A4\u62F7]/.test(title) ? '乱码标题' : null,
    ].filter(Boolean);
    const pass = issues.length === 0;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] E2E-012: title="${title}", issues=${issues.length === 0 ? '无' : issues.join(', ')}`);
    results.push({ id: 'E2E-012', name: '页面标题检查', pass, detail: `title="${title}", issues=[${issues.join(', ')}]` });
  } catch (e) {
    console.log(`[FAIL] E2E-012: ${e.message}`);
    results.push({ id: 'E2E-012', name: '页面标题检查', pass: false, detail: e.message });
  }

  // ===== SUMMARY =====
  console.log('');
  console.log('========== E2E 测试结果汇总 ==========');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);
  console.log('');

  for (const r of results) {
    console.log(`  ${r.pass ? '✓' : '✗'} [${r.id}] ${r.name}: ${r.pass ? 'PASS' : 'FAIL'} — ${r.detail}`);
  }

  console.log('');
  console.log('========== 详细结果 JSON ==========');
  console.log(JSON.stringify(results, null, 2));

  // Save results
  const fs = await import('node:fs');
  fs.writeFileSync(
    '.auth/e2e-full-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results, summary: { total: results.length, passed, failed } }, null, 2),
    'utf8'
  );
  console.log('\n[DONE] 结果已保存到 .auth/e2e-full-results.json');

  await page.waitForTimeout(3000);
  await context.close();
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
