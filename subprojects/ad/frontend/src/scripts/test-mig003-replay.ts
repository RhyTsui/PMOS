import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const HEADLESS = false;
const SCREENSHOT_DIR = path.resolve('.auth');
const AUTH_DIR = path.resolve('.auth');

const loginState = JSON.parse(readFileSync(path.join(AUTH_DIR, 'login-state.json'), 'utf8'));

async function main() {
  console.log('[REPLAY] 启动浏览器验证刷新回放...');
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

  // Navigate to main page
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Find and click on the MIG-003 conversation
  console.log('[REPLAY] 查找 MIG-003 对话...');
  const mig003Conv = page.locator('text=监测回传文档位置').first();
  try {
    await mig003Conv.waitFor({ state: 'visible', timeout: 10000 });
    await mig003Conv.click();
    console.log('[REPLAY] 点击了 MIG-003 对话');
    await page.waitForTimeout(5000);
  } catch {
    console.log('[REPLAY] 未找到 MIG-003 对话');
  }

  // Take screenshot
  await page.screenshot({ path: `${SCREENSHOT_DIR}/MIG-003-replay.png`, fullPage: true });
  console.log('[REPLAY] 回放截图已保存');

  // Check the page content
  const pageText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000));
  console.log(`[REPLAY] 页面文本:\n${pageText}`);

  // Check for the AI response content
  const hasAnswer = pageText.includes('数据上报管理') || pageText.includes('监测回传');
  console.log(`[REPLAY] 包含答案内容: ${hasAnswer}`);

  // Check title
  const pageTitle = await page.title();
  console.log(`[REPLAY] 页面标题: ${pageTitle}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/MIG-003-replay-final.png`, fullPage: true });

  await browser.close();
  console.log('[REPLAY] 完成');
}

main().catch(err => {
  console.error('[REPLAY] 异常:', err);
  process.exit(1);
});
