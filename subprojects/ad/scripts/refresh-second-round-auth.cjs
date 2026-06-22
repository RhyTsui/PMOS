/**
 * Refresh the real auth state used by scripts/run-second-round-tests.cjs.
 * The script never prints token or session values.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.SECOND_ROUND_BASE_URL || 'http://127.0.0.1:8011';
const authFile = path.resolve(process.env.SECOND_ROUND_AUTH_FILE || path.join(repoRoot, '.auth-state', 'auth-tokens.json'));
const profileDir = path.resolve(process.env.SECOND_ROUND_AUTH_PROFILE || path.join(repoRoot, '.auth-state'));
const usePersistentProfile = process.env.SECOND_ROUND_AUTH_PROFILE !== 'none';
const waitMs = Number(process.env.SECOND_ROUND_LOGIN_WAIT_MS || 300000);

async function verifyAuth(page) {
  try {
    const response = await page.request.get(`${baseUrl}/api/xiaoqiao/auth/me`, {
      timeout: 15000,
    });
    return response.ok();
  } catch {
    return false;
  }
}

async function saveAuthState(context) {
  const cookies = await context.cookies();
  const token = cookies.find(cookie => cookie.name === 'xiaoqiao_auth_token');
  const session = cookies.find(cookie => cookie.name === 'xiaoqiao_auth_session');
  if (!token || !session) return false;

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify({
    cookies,
    token: token.value,
    session: session.value,
    timestamp: new Date().toISOString(),
  }, null, 2), 'utf8');
  console.log(`✅ 登录态已保存: ${authFile}`);
  console.log(`   cookies=${cookies.map(cookie => cookie.name).join(',')}`);
  return true;
}

async function main() {
  console.log('🚀 启动浏览器刷新二轮测试登录态');
  console.log(`   baseUrl=${baseUrl}`);
  console.log(`   profile=${usePersistentProfile ? profileDir : 'temporary'}`);
  console.log(`   authFile=${authFile}`);

  const browser = usePersistentProfile
    ? null
    : await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = usePersistentProfile
    ? await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: ['--start-maximized'],
      viewport: null,
    })
    : await browser.newContext({ viewport: null });
  const page = context.pages()[0] || await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (await verifyAuth(page) && await saveAuthState(context)) {
    console.log('✅ 当前浏览器会话已通过登录验证');
    await context.close();
    await browser?.close();
    return;
  }

  console.log('请在打开的浏览器中完成登录。脚本会等待登录成功并保存 cookie。');
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const cookies = await context.cookies();
    const hasCookies = cookies.some(cookie => cookie.name === 'xiaoqiao_auth_token')
      && cookies.some(cookie => cookie.name === 'xiaoqiao_auth_session');
    if (hasCookies && await verifyAuth(page) && await saveAuthState(context)) {
      console.log('✅ 登录验证通过');
      await context.close();
      await browser?.close();
      return;
    }
    const elapsed = Math.round((Date.now() - (deadline - waitMs)) / 1000);
    process.stdout.write(`\r⏳ 等待登录 ${elapsed}s / ${Math.round(waitMs / 1000)}s`);
  }

  console.log('\n❌ 登录等待超时，未更新登录态');
  await context.close();
  await browser?.close();
  process.exit(1);
}

main().catch(error => {
  console.error('刷新登录态失败:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
