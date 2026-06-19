const { chromium } = require('./node_modules/playwright');

(async () => {
  // Try to connect to existing Chrome via CDP
  console.log('Attempting to connect to existing Chrome...');

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();
    console.log('Connected! Current URL:', page.url());

    await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('After navigate URL:', page.url());

    if (!page.url().includes('/login')) {
      console.log('Already logged in!');
      await page.screenshot({ path: 'subprojects/ad/tmp_connected_login.png', fullPage: false });
      console.log('Screenshot saved');
      await context.storageState({ path: 'subprojects/ad/tmp_auth_state.json' });
      console.log('Auth state saved');
    } else {
      console.log('Still on login page');
      await page.screenshot({ path: 'subprojects/ad/tmp_connected_login.png', fullPage: false });
    }

    await browser.close();
  } catch (e) {
    console.log('CDP connect failed:', e.message);
    console.log('Trying to launch Chrome with remote debugging...');

    // Launch Chrome with remote debugging enabled
    const context = await chromium.launchPersistentContext('subprojects/ad/tmp_chrome_login', {
      headless: false,
      viewport: { width: 1280, height: 800 },
      args: ['--start-maximized', '--window-position=0,0', '--remote-debugging-port=9222'],
    });

    const pages = context.pages();
    const page = pages[0] || await context.newPage();
    await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('URL:', page.url());
    console.log('浏览器已打开，请扫码登录');
    console.log('Chrome 远程调试端口: 9222');

    // Wait for login
    let attempts = 0;
    while (attempts < 300) {
      await page.waitForTimeout(1000);
      attempts++;
      if (!page.url().includes('/login')) {
        console.log('Login success!');
        await page.screenshot({ path: 'subprojects/ad/tmp_after_login.png', fullPage: false });
        await context.storageState({ path: 'subprojects/ad/tmp_auth_state.json' });
        console.log('Auth saved');
        break;
      }
    }

    await context.close();
  }
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
