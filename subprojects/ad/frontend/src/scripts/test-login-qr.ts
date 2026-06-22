import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const LOGIN_WAIT_MS = 300_000;
const AUTH_DIR = path.resolve('.auth');

async function main() {
  console.log('[LOGIN] 启动浏览器（非无头模式）...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });
  console.log('[LOGIN] 浏览器已启动');

  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  console.log('[LOGIN] 打开登录页面...');
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const currentUrl = page.url();
  console.log(`[LOGIN] 当前 URL: ${currentUrl}`);

  if (!currentUrl.includes('/login')) {
    console.log('[LOGIN] 已处于登录状态！');
  } else {
    console.log(`[LOGIN] ★★★ 请在浏览器窗口扫码登录 ★★★ (${LOGIN_WAIT_MS / 1000}秒内)`);
    // Poll URL instead of waitForURL to avoid frame detachment issues
    const startTime = Date.now();
    while (Date.now() - startTime < LOGIN_WAIT_MS) {
      await page.waitForTimeout(2000);
      try {
        const url = page.url();
        if (!url.includes('/login')) {
          console.log(`[LOGIN] 检测到跳转: ${url}`);
          break;
        }
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (elapsed % 30 === 0 && elapsed > 0) {
          console.log(`[LOGIN] 等待扫码中... (${elapsed}s)`);
        }
      } catch {
        // Page might be navigating, wait a bit more
      }
    }
    const urlAfterWait = page.url();
    if (urlAfterWait.includes('/login')) {
      console.log('[LOGIN] 登录超时，请重新运行脚本');
      await browser.close();
      process.exit(1);
    }
    console.log('[LOGIN] 登录成功！');
  }

  await page.waitForTimeout(3000);

  // Save login state
  const storageState = await context.storageState();
  const loginStatePath = path.join(AUTH_DIR, 'login-state.json');
  writeFileSync(loginStatePath, JSON.stringify(storageState, null, 2), 'utf8');
  console.log(`[LOGIN] 登录态已保存到 ${loginStatePath}`);

  // Verify
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const finalUrl = page.url();
  console.log(`[LOGIN] 验证 URL: ${finalUrl}`);

  await page.screenshot({ path: path.join(AUTH_DIR, 'login-verified.png'), fullPage: true });
  console.log('[LOGIN] 验证截图已保存');

  await browser.close();
  console.log('[LOGIN] 完成！');
}

main().catch(err => {
  console.error('[LOGIN] 异常:', err);
  process.exit(1);
});
