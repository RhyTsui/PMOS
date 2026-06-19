import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const LOGIN_WAIT_MS = 300_000; // 5 minutes for user to scan
const AUTH_DIR = path.resolve('.auth');

async function main() {
  console.log('[LOGIN] 启动浏览器（非无头模式，请扫码登录）...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  console.log('[LOGIN] 打开登录页面...');
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const currentUrl = page.url();
  console.log(`[LOGIN] 当前 URL: ${currentUrl}`);

  if (!currentUrl.includes('/login')) {
    console.log('[LOGIN] 已处于登录状态！');
  } else {
    console.log(`[LOGIN] 请在 ${LOGIN_WAIT_MS / 1000} 秒内完成扫码登录...`);
    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: LOGIN_WAIT_MS,
        waitUntil: 'domcontentloaded',
      });
      console.log('[LOGIN] 登录成功！');
    } catch {
      console.log('[LOGIN] 登录超时，请重新运行脚本');
      await browser.close();
      process.exit(1);
    }
  }

  // Wait a bit for the page to fully load
  await page.waitForTimeout(3000);

  // Save login state (cookies)
  const storageState = await context.storageState();
  const loginStatePath = path.join(AUTH_DIR, 'login-state.json');
  writeFileSync(loginStatePath, JSON.stringify(storageState, null, 2), 'utf8');
  console.log(`[LOGIN] 登录态已保存到 ${loginStatePath}`);

  // Verify we can access the main page
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const finalUrl = page.url();
  console.log(`[LOGIN] 验证 URL: ${finalUrl}`);

  if (finalUrl.includes('/login')) {
    console.log('[LOGIN] 警告：验证时仍在登录页');
  } else {
    console.log('[LOGIN] 登录态验证通过！');
  }

  // Take a screenshot to confirm
  await page.screenshot({ path: path.join(AUTH_DIR, 'login-verified.png'), fullPage: true });
  console.log('[LOGIN] 验证截图已保存');

  await browser.close();
  console.log('[LOGIN] 完成，可以使用新的登录态执行测试了');
}

main().catch(err => {
  console.error('[LOGIN] 异常:', err);
  process.exit(1);
});
