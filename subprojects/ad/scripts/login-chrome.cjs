/**
 * 用系统 Chrome 登录并抓取 cookie
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.resolve('E:/AI/ai-os/subprojects/ad/tmp/auth-state.json');
const BASE_URL = 'http://localhost:8002';

async function login() {
  console.log('🚀 启动系统 Chrome...');

  // 使用系统 Chrome（非 headless），窗口可见
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--new-window', '--window-size=1200,900'],
  });

  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('📱 当前页面:', page.url());
  console.log('');
  console.log('='.repeat(60));
  console.log('📱 请在 Chrome 中扫码登录！');
  console.log('='.repeat(60));

  // 轮询等 5 分钟
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const cookies = await context.cookies();
    const token = cookies.find(c => c.name === 'xiaoqiao_auth_token');
    const session = cookies.find(c => c.name === 'xiaoqiao_auth_session');
    const url = page.url();
    const elapsed = Math.round((Date.now() - (deadline - 300000)) / 1000);

    if (token && session && !url.includes('/login')) {
      console.log('\n✅ 登录成功！');
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
      fs.writeFileSync(AUTH_FILE, JSON.stringify({
        cookies,
        token: token.value,
        session: session.value,
        timestamp: new Date().toISOString(),
      }, null, 2));
      console.log('✅ Cookie 已保存');
      console.log(`   token: ${token.value.slice(0, 50)}...`);
      console.log(`   session: ${session.value.slice(0, 50)}...`);
      await new Promise(r => setTimeout(r, 3000));
      await browser.close();
      return;
    }

    process.stdout.write(`\r⏳ ${elapsed}s | ${url.slice(0, 50)}`);
  }

  console.log('\n❌ 超时');
  await browser.close();
}

login().catch(console.error);
