/**
 * Login helper - launches a visible browser for manual QR code scanning.
 * After login succeeds, saves auth tokens to .auth-state/ for reuse.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://10.236.14.27:8002';
const LOGIN_URL = BASE_URL + '/login?redirect=%2F';
const AUTH_DIR = path.join(__dirname, '.auth-state');
const AUTH_FILE = path.join(AUTH_DIR, 'auth-tokens.json');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function saveAuthState(context, page) {
  const authData = await page.evaluate(() => {
    return {
      token: window.localStorage.getItem('__YK_LOGIN_TOKEN__') || '',
      sessionId: window.localStorage.getItem('__YK_LOGIN_SESSION_ID__') || '',
      tokenCookie: (document.cookie.match(/(?:^|; )xiaoqiao_auth_token=([^;]*)/) || [])[1] || '',
      sessionCookie: (document.cookie.match(/(?:^|; )xiaoqiao_auth_session=([^;]*)/) || [])[1] || '',
      cookies: document.cookie,
      allLocalStorage: {
        token: window.localStorage.getItem('__YK_LOGIN_TOKEN__'),
        sessionId: window.localStorage.getItem('__YK_LOGIN_SESSION_ID__'),
        authToken: window.localStorage.getItem('xiaoqiao_auth_token'),
        authSession: window.localStorage.getItem('xiaoqiao_auth_session'),
      },
    };
  });

  const client = await context.newCDPSession(page);
  const { cookies } = await client.send('Network.getAllCookies');
  const relevantCookies = cookies.filter(c =>
    c.name.includes('xiaoqiao') || c.name.includes('auth') || c.name.includes('session') || c.name.includes('token')
  );

  const savedAuth = {
    timestamp: new Date().toISOString(),
    url: page.url(),
    authData,
    cookies: relevantCookies,
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(savedAuth, null, 2));
  log('Auth state saved to: ' + AUTH_FILE);
  log('Token present: ' + (authData.token ? 'YES' : 'NO'));
  log('SessionId present: ' + (authData.sessionId ? 'YES' : 'NO'));
}

async function main() {
  log('=== LOGIN HELPER ===');
  log('Launching visible browser for QR code login...');
  log('Please scan the QR code when the browser window appears.');

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--start-maximized'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages()[0] || await context.newPage();

  log('Navigating to ' + LOGIN_URL);
  await page.goto(LOGIN_URL, { waitUntil: 'commit', timeout: 60000 });
  await sleep(5000);

  const currentUrl = page.url();
  log('Current URL: ' + currentUrl);

  if (currentUrl.includes('/login')) {
    log('');
    log('=== QR CODE LOGIN REQUIRED ===');
    log('Please scan the QR code in the browser window.');
    log('Waiting up to 180 seconds for login to complete...');
    log('');

    // Wait for URL to change away from /login
    try {
      await page.waitForURL(url => !url.toString().includes('/login'), {
        timeout: 180000,
      });
      log('Login detected! New URL: ' + page.url());
    } catch (e) {
      log('ERROR: Login timeout. Please try again.');
      await context.close();
      process.exit(1);
    }

    // Wait for page to fully load after login
    await sleep(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await sleep(3000);

    await saveAuthState(context, page);

    // Take a screenshot to confirm login succeeded
    await page.screenshot({ path: path.join(__dirname, '.test-screenshots', 'login-success.png'), fullPage: true });

    // Also verify we can reach the main page
    const mainPageContent = await page.evaluate(() => document.body.innerText.slice(0, 500));
    log('Main page content preview: ' + mainPageContent.slice(0, 200));

    log('');
    log('=== LOGIN SUCCESSFUL ===');
    log('Auth state has been saved. Closing browser...');

    await sleep(2000);
    await context.close();
    log('Browser closed. You can now run the E2E test.');
  } else {
    log('Already logged in! URL: ' + currentUrl);
    await saveAuthState(context, page);
    log('No login needed. Auth state refreshed.');
    await context.close();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
