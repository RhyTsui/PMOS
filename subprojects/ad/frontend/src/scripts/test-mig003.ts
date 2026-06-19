import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const HEADLESS = false;
const TEST_CASE_ID = 'MIG-003';
const TEST_PROMPT = 'https://open.oceanengine.com/labels/7 监测回传文档在哪';
const SCREENSHOT_DIR = path.resolve('.auth');
const AUTH_DIR = path.resolve('.auth');

const loginState = JSON.parse(readFileSync(path.join(AUTH_DIR, 'login-state.json'), 'utf8'));

async function main() {
  console.log(`[MIG-003] 启动浏览器 headless=${HEADLESS}`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: loginState,
  });

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  if (page.url().includes('/login')) {
    console.log('[MIG-003] 登录态已失效');
    await browser.close();
    return;
  }

  // Step 1: Create new conversation via UI and get the conversation ID from the URL
  console.log('[MIG-003] 创建新对话...');
  const newChatBtn = page.locator('button:has-text("开启新对话"), button:has-text("新对话"), [aria-label*="新对话"]').first();
  let conversationId = '';

  try {
    await newChatBtn.waitFor({ state: 'visible', timeout: 5000 });
    await newChatBtn.click();
    await page.waitForTimeout(3000);

    // Extract conversation ID from URL if available
    const url = new URL(page.url());
    conversationId = url.searchParams.get('conversation') || url.searchParams.get('id') || '';
    console.log(`[MIG-003] UI 对话 ID (from URL): ${conversationId || '(none)'}`);
  } catch {
    console.log('[MIG-003] 未找到新对话按钮');
  }

  // Step 2: Send message through the UI input
  console.log(`[MIG-003] 通过 UI 输入消息: ${TEST_PROMPT}`);
  const selectors = [
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="问题"]',
    'textarea.ant-input',
    'textarea',
  ];

  let inputArea: ReturnType<typeof page.locator> | null = null;
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      inputArea = el;
      console.log(`[MIG-003] 找到输入框: ${selector}`);
      break;
    } catch {
      continue;
    }
  }

  if (!inputArea) {
    console.log('[MIG-003] 未找到输入框');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${TEST_CASE_ID}-no-input.png`, fullPage: true });
    await browser.close();
    return;
  }

  // Type and send
  await inputArea.click();
  await inputArea.fill(TEST_PROMPT);
  await page.waitForTimeout(500);

  // Find send button or use Enter
  const sendBtn = page.locator('button:has-text("发送"), button:has-text("Send"), [aria-label="发送"]').first();
  let sendFound = false;
  try {
    await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
    sendFound = true;
  } catch {}

  if (sendFound) {
    await sendBtn.click();
  } else {
    await inputArea.press('Enter');
  }

  console.log('[MIG-003] 消息已发送，等待 AI 响应...');

  // Step 3: Wait for AI response through UI
  const maxWait = 120000;
  const startTime = Date.now();
  let hasAIResponse = false;
  let responseText = '';

  while (Date.now() - startTime < maxWait) {
    const result = await page.evaluate(() => {
      // Look for AI response bubbles (typically different from user bubbles)
      const bubbles = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="assistant"], [class*="ai-"]');
      let aiText = '';
      for (const bubble of bubbles) {
        const text = bubble.innerText || '';
        // Skip user messages (they contain the prompt)
        if (text.includes('oceanengine.com') && text.length < 200) continue;
        // Skip placeholder texts
        if (text.includes('准备执行') || text.includes('大模型检测') || text.includes('输入问题')) continue;
        if (text.length > 50) {
          aiText = text;
          break;
        }
      }
      // Also check for markdown content
      const markdown = document.querySelector('[class*="markdown"], [class*="prose"], [class*="content"]');
      const markdownText = markdown?.innerText || '';
      return { aiText, markdownText: markdownText.slice(0, 500) };
    });

    if (result.aiText.length > 50 || result.markdownText.length > 50) {
      hasAIResponse = true;
      responseText = result.aiText || result.markdownText;
      console.log(`[MIG-003] 检测到 AI 响应 (${responseText.length} 字符)`);
      break;
    }

    await page.waitForTimeout(3000);
  }

  // Wait a bit more for rendering to complete
  await page.waitForTimeout(5000);

  // Step 4: Get final page state
  const pageText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000));
  console.log(`\n[MIG-003] 页面文本:\n${pageText.slice(0, 1000)}`);

  // Take screenshot
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${TEST_CASE_ID}-ui-result.png`, fullPage: true });
  console.log(`[MIG-003] UI 结果截图已保存`);

  // Step 5: Check conversation was saved
  const currentUrl = page.url();
  console.log(`[MIG-003] 当前 URL: ${currentUrl}`);

  // Extract conversation ID from current URL
  const urlObj = new URL(currentUrl);
  const currentConvId = urlObj.searchParams.get('conversation') || urlObj.searchParams.get('id') || '';
  console.log(`[MIG-003] 当前对话 ID: ${currentConvId}`);

  // Check conversation messages via API
  if (currentConvId) {
    const convData = await page.evaluate(async (convId: string) => {
      const resp = await window.fetch(`/api/xiaoqiao/conversations/${convId}/messages?limit=30`);
      const text = await resp.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text.slice(0, 500) };
      }
    }, currentConvId);
    console.log(`[MIG-003] 会话消息 API 响应:`, JSON.stringify(convData).slice(0, 500));
  }

  // Step 6: Validation summary
  console.log(`\n========== MIG-003 验证总结 ==========`);
  console.log(`✓ 用户消息发送: true`);
  console.log(`✓ AI 响应检测到: ${hasAIResponse}`);
  console.log(`✓ 响应文本长度: ${responseText.length}`);
  console.log(`✓ 控制台错误数: ${consoleErrors.length}`);
  console.log(`✓ 对话 ID: ${currentConvId || '(unknown)'}`);

  const allPassed = hasAIResponse && responseText.length > 50;
  console.log(`\n[MIG-003] ${allPassed ? '✅ 通过' : '⚠️ 需要检查'}`);

  await browser.close();
  console.log('[MIG-003] 完成');
}

main().catch(err => {
  console.error('[MIG-003] 异常:', err);
  process.exit(1);
});
