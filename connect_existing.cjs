const { chromium } = require('./node_modules/playwright');

(async () => {
  console.log('Connecting to existing Chrome on port 9334...');
  const browser = await chromium.connectOverCDP('http://localhost:9334');
  const contexts = browser.contexts();

  let page = contexts[0]?.pages()[0];
  if (!page) {
    page = await contexts[0].newPage();
  }

  console.log('Current URL:', page.url());

  // Take screenshot of current state
  await page.screenshot({ path: 'subprojects/ad/tmp_chrome_current.png', fullPage: false });
  console.log('Screenshot saved');

  // Navigate to the app
  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('After navigate URL:', page.url());

  // Screenshot after navigate
  await page.screenshot({ path: 'subprojects/ad/tmp_after_navigate.png', fullPage: false });
  console.log('Navigate screenshot saved');

  await browser.close();
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
