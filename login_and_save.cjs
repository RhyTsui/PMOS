const { chromium } = require('./node_modules/playwright');

(async () => {
  const context = await chromium.launchPersistentContext('subprojects/ad/tmp_chrome_login', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--start-maximized'],
  });

  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  console.log('请扫码登录...');

  // Poll every 1s for up to 3 minutes
  let attempts = 0;
  const maxAttempts = 180;
  while (attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    attempts++;
    const url = page.url();
    if (!url.includes('/login')) {
      console.log('Login detected! URL:', url);
      break;
    }
    if (attempts % 30 === 0) {
      console.log('Waiting for login... (' + attempts + 's)');
    }
  }

  if (attempts >= maxAttempts) {
    console.log('Login timeout after 3 minutes');
    await context.close();
    process.exit(1);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'subprojects/ad/tmp_after_login.png', fullPage: false });
  console.log('Screenshot saved');

  await context.storageState({ path: 'subprojects/ad/tmp_auth_state.json' });
  console.log('Auth state saved');

  await context.close();
  console.log('Done');
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
