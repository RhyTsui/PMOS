const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://10.236.14.27:8002/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());
  const title = await page.title();
  console.log('Page title:', title);

  // Check for chat input
  const chatInput = await page.$('textarea');
  if (chatInput) {
    console.log('Chat textarea found - LOGGED IN');
  } else {
    const editableInput = await page.$('[contenteditable="true"]');
    if (editableInput) {
      console.log('Contenteditable found - LOGGED IN');
    } else {
      console.log('No chat input found');
    }
  }

  await page.screenshot({ path: 'subprojects/ad/tmp_verify_login.png', fullPage: false });
  console.log('Screenshot saved');

  await browser.close();
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
