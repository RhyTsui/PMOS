const { chromium } = require('./node_modules/playwright');

(async () => {
  const context = await chromium.launchPersistentContext('subprojects/ad/tmp_chrome_login', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--start-maximized', '--window-position=0,0'],
  });

  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  console.log('浏览器已打开，二维码可见。请扫码登录。');
  console.log('浏览器将保持打开 5 分钟等待扫码...');

  // Poll for 5 minutes
  let attempts = 0;
  const maxAttempts = 300;
  while (attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    attempts++;
    const url = page.url();
    if (!url.includes('/login')) {
      console.log('Login success! URL:', url);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'subprojects/ad/tmp_after_login.png', fullPage: false });
      console.log('Screenshot saved');
      await context.storageState({ path: 'subprojects/ad/tmp_auth_state.json' });
      console.log('Auth state saved');
      await context.close();
      console.log('Done');
      process.exit(0);
    }
    if (attempts % 60 === 0) {
      console.log('Still waiting... (' + attempts + 's elapsed)');
    }
  }

  console.log('Timeout');
  await context.close();
  process.exit(1);
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
