const { chromium } = require('./node_modules/playwright');

(async () => {
  console.log('Launching fresh Chrome...');
  const context = await chromium.launchPersistentContext('subprojects/ad/tmp_chrome_fresh', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--start-maximized',
      '--window-position=100,100',
      '--remote-debugging-port=9334',
    ],
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('Navigating to login page...');
  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  console.log('浏览器窗口应该已经弹出，请扫码登录');

  // Wait for login (5 min timeout)
  let attempts = 0;
  while (attempts < 300) {
    await page.waitForTimeout(1000);
    attempts++;
    if (!page.url().includes('/login')) {
      console.log('Login success! URL:', page.url());
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'subprojects/ad/tmp_login_success.png', fullPage: false });
      await context.storageState({ path: 'subprojects/ad/tmp_auth_state.json' });
      console.log('Auth saved');
      break;
    }
    if (attempts % 60 === 0) {
      console.log('Waiting... ' + attempts + 's');
    }
  }

  await context.close();
  console.log('Done');
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
