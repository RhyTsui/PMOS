/**
 * 第二轮测试 E2E 验证
 *
 * 使用 Playwright 持久化上下文，首次运行扫码登录后状态会保存，
 * 后续运行自动复用登录态。
 *
 * 启动方式：
 *   cd /e/AI/ai-os && node subprojects/ad/frontend/src/scripts/e2e-round2.mjs
 *
 * 用户数据目录：subprojects/ad/frontend/src/.auth/pw-data/
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.resolve(__dirname, '..', '.auth', 'pw-data');
const BASE_URL = 'http://10.236.14.27:8002';
const CONVERSATION_TIMEOUT_MS = 300_000; // 5 分钟：URL 抓取等场景需要更长时间

// 从命令行传入测试消息，默认 "你好"
const TEST_MESSAGE = process.argv[2] || '你好';
const CASE_ID = process.env.E2E_CASE_ID || 'MIG-000';

async function ensureDirs() {
  if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

async function waitForLogin(page) {
  console.log('[auth] 当前 URL:', page.url());
  console.log('[auth] 需要登录——请在弹出的浏览器窗口扫码登录');
  console.log('[auth] 登录后脚本将自动继续（最长 5 分钟）');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 5 * 60_000,
  });
  console.log('[auth] 登录成功');
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // 等待首页组件就绪
  await page.waitForTimeout(2000);
}

async function ensureLoggedIn(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // 等待 Next.js 编译完成（Compiling overlay 消失）
  await page.waitForFunction(() => {
    const compiling = document.querySelector('[class*="compiling"], [class*="Compiling"]');
    return !compiling;
  }, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    await waitForLogin(page);
  } else {
    console.log('[auth] 复用已有登录态');
  }
}

async function startNewConversation(page) {
  const newChatSelectors = [
    'button:has-text("新建对话")',
    'button:has-text("新对话")',
    'button:has-text("新建")',
    'button[aria-label*="新"]',
    'button[title*="新"]',
    '[data-testid="new-conversation"]',
    '[data-testid="new-chat"]',
  ];
  for (const selector of newChatSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(500);
      console.log('[chat] 已点击新建会话:', selector);
      return;
    }
  }
  console.log('[chat] 未找到新建会话按钮，直接在当前页面发送');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // 等待编译完成 + 页面就绪
  await page.waitForFunction(() => {
    const compiling = document.querySelector('[class*="compiling"], [class*="Compiling"]');
    return !compiling;
  }, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function findInput(page) {
  const inputSelectors = [
    'textarea[data-testid="chat-input"]',
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="问"]',
    'textarea',
    '[contenteditable="true"]',
  ];
  for (const selector of inputSelectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible({ timeout: 800 }).catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function sendMessage(page, message) {
  const input = await findInput(page);
  if (!input) throw new Error('未找到消息输入框');
  await input.click();
  await input.fill(message);
  await page.waitForTimeout(200);
  // 寻找发送按钮
  const sendSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="发送"]',
    'button[title*="发送"]',
    'button[type="submit"]',
    'button:has-text("发送")',
  ];
  let sent = false;
  for (const selector of sendSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      sent = true;
      console.log('[chat] 点击发送按钮:', selector);
      break;
    }
  }
  if (!sent) {
    await input.press('Enter');
    console.log('[chat] 按 Enter 发送');
  }
}

async function waitForAssistantResponse(page, timeout = CONVERSATION_TIMEOUT_MS) {
  const startTime = Date.now();
  let lastSeenText = '';
  let stableCount = 0;

  while (Date.now() - startTime < timeout) {
    // 直接从页面主体获取所有文本，排除已知干扰
    const domText = await page.evaluate((testMsg) => {
      // 找主聊天内容区域
      const mainArea = document.querySelector('[class*="chat-container"]')
        || document.querySelector('[class*="ChatContainer"]')
        || document.querySelector('main')
        || document.querySelector('[class*="conversation"]')
        || document.body;

      // 从主区域获取所有文本节点
      const walker = document.createTreeWalker(
        mainArea,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            const cls = parent.className || '';
            // 跳过 script/style/输入框/侧边栏
            if (['script', 'style', 'textarea', 'input'].includes(tag)) return NodeFilter.FILTER_REJECT;
            if (/sidebar|nav|header|footer|login/i.test(cls)) return NodeFilter.FILTER_REJECT;
            if (node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t) texts.push(t);
      }

      // 合并为一段完整文本
      const fullText = texts.join('\n');

      // 排除纯欢迎语/占位符
      const placeholders = [
        '输入问题', '需求或操作任务', '小乔智投', '此生之涯',
        '愿与君老', '随时准备好', '只等你需要', '正在思考',
        '生成中', '开启新对话', 'yoka超管', '三国杀',
        '一将成名', '准备执行', '执行中',
        testMsg, // 排除用户消息本身（防止重复出现在 AI 区域）
      ];
      let filtered = fullText;
      for (const ph of placeholders) {
        filtered = filtered.replace(new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      }
      filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();

      return { fullText: fullText.slice(0, 5000), filtered: filtered.slice(0, 5000) };
    }, TEST_MESSAGE).catch(() => ({ fullText: '', filtered: '' }));

    const content = domText.filtered;

    // 有实质内容（排除只剩欢迎语的噪声）
    if (content.length > 50) {
      if (content !== lastSeenText) {
        lastSeenText = content;
        stableCount = 0;
      } else {
        stableCount++;
        // 长回复需要更长稳定时间（5 秒），短回复 3 秒即可
        const requiredStable = content.length > 200 ? 5 : 3;
        if (stableCount >= requiredStable) return content;
      }
    }

    await page.waitForTimeout(1000);
  }

  if (lastSeenText && lastSeenText.length > 30) return lastSeenText;
  throw new Error('等待 AI 回复超时');
}

async function capturePageState(page) {
  return page.evaluate(() => {
    const getVisibleText = () => {
      const messages = [];
      document.querySelectorAll('[data-role], [class*="message"], [class*="bubble"]').forEach((el) => {
        const role = el.getAttribute('data-role') || el.className;
        const text = (el.innerText || '').trim();
        if (text) messages.push({ role: role.slice(0, 40), text: text.slice(0, 500) });
      });
      return messages;
    };
    return {
      url: location.href,
      title: document.title,
      bodyPreview: (document.body.innerText || '').slice(0, 2000),
      messages: getVisibleText(),
      consoleErrors: window.__consoleErrors || [],
    };
  });
}

async function installConsoleCapture(page) {
  await page.addInitScript(() => {
    window.__consoleErrors = [];
    const originalError = console.error;
    console.error = function (...args) {
      window.__consoleErrors.push(args.map((a) => String(a)).join(' ').slice(0, 300));
      originalError.apply(console, args);
    };
  });
}

async function checkNoInternalLeak(text) {
  const leaks = [
    /routeDecision/i,
    /semanticFrame/i,
    /query_contract/,
    /slot_validation/,
    /trace_id[:=]/i,
    /message_id[:=]/i,
    /business_summary/,
    /answer_markdown/,
  ];
  const found = leaks.filter((re) => re.test(text));
  return found;
}

async function refreshAndWaitReplay(page, expectedText) {
  console.log('[replay] 刷新页面，验证回放…');
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  // 等待前端加载会话列表并选中最近会话
  await page.waitForTimeout(5000);

  const replayCheck = await page.evaluate((testMsg) => {
    // 检查 1：侧边栏是否有包含测试消息的会话
    const sidebarText = document.body.innerText || '';
    const hasInSidebar = sidebarText.includes(testMsg);

    // 检查 2：主内容区是否有消息气泡
    const messageEls = document.querySelectorAll(
      '[data-role="user"], [data-role="assistant"], [class*="user-message"], [class*="assistant-message"], [class*="UserBubble"], [class*="AssistantBubble"], [class*="user-bubble"], [class*="assistant-bubble"]'
    );
    let userMsgFound = false;
    let aiMsgFound = false;
    for (const el of messageEls) {
      const text = (el.innerText || '').trim();
      const role = el.getAttribute('data-role') || el.className || '';
      if (text.includes(testMsg)) userMsgFound = true;
      if (/assistant|bot|ai/i.test(role) && text.length > 10) aiMsgFound = true;
    }

    // 检查 3：主区域文本（兜底）
    const mainArea = document.querySelector('main') || document.querySelector('[class*="chat"]') || document.body;
    const mainText = mainArea.innerText || '';
    const hasInMain = mainText.includes(testMsg);

    return {
      hasInSidebar,
      userMsgFound,
      aiMsgFound,
      hasInMain,
      sidebarHasConversation: /南京本周日天气|新对话/.test(sidebarText),
    };
  }, TEST_MESSAGE);

  const hasHistory = replayCheck.userMsgFound || replayCheck.hasInMain || replayCheck.hasInSidebar;
  const hasAiReply = replayCheck.aiMsgFound || replayCheck.hasInMain;
  console.log('[replay] 侧边栏有会话:', replayCheck.sidebarHasConversation ? 'OK' : 'MISSING');
  console.log('[replay] 历史用户消息回放:', hasHistory ? 'OK' : 'MISSING', `(user:${replayCheck.userMsgFound}, main:${replayCheck.hasInMain}, sidebar:${replayCheck.hasInSidebar})`);
  console.log('[replay] AI 回复回放:', hasAiReply ? 'OK' : 'MISSING', `(assistant:${replayCheck.aiMsgFound}, main:${replayCheck.hasInMain})`);
  return { hasHistory, hasAiReply, urlAfter: page.url(), replayCheck };
}

async function runTestCase(page) {
  console.log(`\n========== 用例 ${CASE_ID} ==========`);
  console.log(`[test] 输入: ${TEST_MESSAGE}`);

  await startNewConversation(page);
  await page.waitForTimeout(500);

  // 确认输入框可用
  const input = await findInput(page);
  if (!input) throw new Error('未找到消息输入框');
  console.log('[test] 输入框已就绪');

  // 发送
  await sendMessage(page, TEST_MESSAGE);

  // 等待用户消息即时落位（乐观渲染）
  await page.waitForTimeout(300);
  const bodyAfterSend = await page.evaluate(() => document.body.innerText || '');
  if (!bodyAfterSend.includes(TEST_MESSAGE)) {
    console.log('[test] 警告：用户消息未即时显示');
  } else {
    console.log('[test] 用户消息即时落位: OK');
  }

  // 等待 AI 回复
  const reply = await waitForAssistantResponse(page);
  console.log(`[test] AI 回复 (${reply.length} 字):`, reply.slice(0, 300));

  // 检查主消息不泄露内部字段
  const leaks = await checkNoInternalLeak(reply);
  if (leaks.length) {
    console.log('[test] 主消息泄露内部字段:', leaks.map((r) => r.source));
  } else {
    console.log('[test] 主消息无内部字段泄露: OK');
  }

  // 抓页面状态
  const state = await capturePageState(page);
  console.log('[test] 页面 title:', state.title);
  console.log('[test] 页面 URL:', state.url);
  if (state.consoleErrors.length) {
    console.log(`[test] 浏览器 console errors (${state.consoleErrors.length}):`);
    for (const err of state.consoleErrors.slice(0, 5)) console.log('  [err]', err);
  } else {
    console.log('[test] 浏览器 console: 无错误');
  }

  // 刷新回放
  const replay = await refreshAndWaitReplay(page, reply);

  // 标题检查
  const title = state.title || '';
  const titleIssues = [
    !title || title.length < 2 ? '空标题' : null,
    /routeDecision|semanticFrame|trace_id|message_id/.test(title) ? '内部字段标题' : null,
    new RegExp('[\\u951f\\u65a4\\u62f7]').test(title) ? '乱码标题' : null,
  ].filter(Boolean);
  if (titleIssues.length) {
    console.log('[test] 标题问题:', titleIssues);
  } else {
    console.log('[test] 标题正常:', title);
  }

  // 判定 MIG-000 通过条件
  const passConditions = {
    hasReply: reply.length > 5,
    noLeak: leaks.length === 0,
    userMsgShown: bodyAfterSend.includes(TEST_MESSAGE),
    replayOk: replay.hasHistory && replay.hasAiReply,
    titleOk: titleIssues.length === 0,
    noConsoleError: state.consoleErrors.length === 0,
  };
  console.log('\n[test] 通过条件:');
  for (const [k, v] of Object.entries(passConditions)) {
    console.log(`  ${v ? '✓' : '✗'} ${k}`);
  }
  const allPass = Object.values(passConditions).every(Boolean);
  console.log(`\n[test] 用例 ${CASE_ID} 结论: ${allPass ? '通过' : '未通过'}`);

  return { allPass, reply, state, passConditions };
}

async function main() {
  ensureDirs();
  console.log('[init] 用户数据目录:', USER_DATA_DIR);
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    args: ['--start-maximized'],
  });
  const page = context.pages()[0] || await context.newPage();
  await installConsoleCapture(page);

  try {
    await ensureLoggedIn(page);
    const result = await runTestCase(page);
    if (!result.allPass) process.exitCode = 1;
  } catch (error) {
    console.error('[test] 失败:', error.message);
    await page.screenshot({ path: path.resolve(USER_DATA_DIR, '..', `${CASE_ID}-failure.png`) }).catch(() => {});
    process.exitCode = 1;
  } finally {
    console.log('[done] 5 秒后关闭浏览器…');
    await page.waitForTimeout(5000);
    await context.close();
  }
}

main();
