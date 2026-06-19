/**
 * 登录并保存认证状态 (持久化 Profile 版)
 * 使用 persistent context，登录一次后 cookie 永久保存在 profile 目录
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROFILE_DIR = path.resolve('E:/AI/ai-os/subprojects/ad/tmp/browser-auth-profile');
const AUTH_FILE = path.resolve('E:/AI/ai-os/subprojects/ad/tmp/auth-state.json');
const BASE_URL = 'http://localhost:8002';

async function login() {
  console.log('🚀 启动持久化浏览器...');
  console.log('   Profile:', PROFILE_DIR);

  // 使用持久化 context — 登录后 cookie 自动保存
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--start-maximized'],
    viewport: null,
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('📱 正在打开应用...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  const url = page.url();
  console.log('当前页面:', url);

  // 先检查是否已经登录（持久化 profile 可能有有效 cookie）
  const existingCookies = await context.cookies();
  const existingToken = existingCookies.find(c => c.name === 'xiaoqiao_auth_token');

  if (existingToken && !url.includes('/login')) {
    console.log('✅ 已有有效登录状态，无需重新扫码！');
    await saveAuthState(context);
    await context.close();
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📱 请在浏览器中扫码登录');
  console.log('   登录后状态会永久保存在 profile 中');
  console.log('   下次运行无需再扫码');
  console.log('='.repeat(60));
  console.log('');

  // 轮询等待登录
  const deadline = Date.now() + 300000; // 5 分钟
  let loggedIn = false;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const currentUrl = page.url();
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'xiaoqiao_auth_token');

    const elapsed = Math.round((Date.now() - (deadline - 300000)) / 1000);
    process.stdout.write(`\r⏳ 等待登录... ${elapsed}s | URL: ${currentUrl.slice(0, 50)}`);

    // 登录成功后会跳转离开 /login 页面
    if (tokenCookie && !currentUrl.includes('/login')) {
      loggedIn = true;
      console.log('\n✅ 登录成功！');
      await saveAuthState(context);
      break;
    }
  }

  if (!loggedIn) {
    console.log('\n❌ 登录超时（5 分钟）');
  }

  await new Promise(r => setTimeout(r, 2000));
  await context.close();
}

async function saveAuthState(context) {
  const cookies = await context.cookies();
  const tokenCookie = cookies.find(c => c.name === 'xiaoqiao_auth_token');
  const sessionCookie = cookies.find(c => c.name === 'xiaoqiao_auth_session');

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({
    cookies,
    token: tokenCookie?.value || '',
    session: sessionCookie?.value || '',
    timestamp: new Date().toISOString(),
  }, null, 2));

  console.log(`✅ 认证状态已保存: ${AUTH_FILE}`);
  console.log(`   token: ${(tokenCookie?.value || '').slice(0, 40)}...`);
  console.log(`   session: ${(sessionCookie?.value || '').slice(0, 40)}...`);
}

login().catch(console.error);
