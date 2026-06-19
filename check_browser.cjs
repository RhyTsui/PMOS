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
  console.log('Screenshot taken immediately');

  // Take screenshot right away
  await page.screenshot({ path: 'subprojects/ad/tmp_browser_current.png', fullPage: false });
  console.log('Current state saved');

  // Wait 10s then take another
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'subprojects/ad/tmp_browser_10s.png', fullPage: false });
  console.log('10s state saved');

  await context.close();
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
