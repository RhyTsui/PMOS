/**
 * IntentOrch E2E Browser - 稳定版
 */
const { chromium } = require('E:/AI/ai-os/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://10.236.14.27:8002';
const USER_DIR = path.join(process.env.TEMP || '/tmp', 'xiaoqiao-browser-profile');
const OUT = process.cwd();

// 出错不关浏览器
process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err.message);
  console.log('[HOLD] 浏览器保持打开，按 Ctrl+C 退出');
});
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED]', err?.message || err);
});

async function hold() {
  console.log('\n[HOLD] 按 Ctrl+C 退出\n');
  await new Promise(() => {});
}

(async () => {
  let context;

  // 1. 启动浏览器
  console.log('[1/5] 启动 Chrome...');
  try {
    context = await chromium.launchPersistentContext(USER_DIR, {
      headless: false,
      channel: 'chrome',
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
    });
    console.log('[1/5] ✅ Chrome 已启动');
  } catch (err) {
    console.error('[1/5] ❌ Chrome 启动失败:', err.message);
    console.log('尝试 Chromium...');
    try {
      context = await chromium.launchPersistentContext(USER_DIR, {
        headless: false,
        viewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
      });
      console.log('[1/5] ✅ Chromium 已启动');
    } catch (err2) {
      console.error('[1/5] ❌ Chromium 也失败:', err2.message);
      console.log('\n可能原因：');
      console.log('  1. Chrome 正在被其他程序使用（关闭所有 Chrome 窗口再试）');
      console.log('  2. 需要安装: npx playwright install chromium');
      await hold();
      return;
    }
  }

  const page = context.pages()[0] || await context.newPage();

  // 2. 打开登录页
  console.log(`[2/5] 打开 ${BASE_URL}/login ...`);
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, 'step1-login.png') });
    console.log('[2/5] ✅ 登录页已打开');
  } catch (err) {
    console.error('[2/5] ❌ 打开失败:', err.message);
    console.log(`请确认 dev server 在运行: ${BASE_URL}`);
    await hold();
    return;
  }

  // 3. 等待登录
  console.log('\n========================================');
  console.log('  📱 请在浏览器中扫码登录');
  console.log('  登录成功后脚本会自动继续');
  console.log('  （最多等待 3 分钟）');
  console.log('========================================\n');

  let loginOk = false;
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const url = page.url();
      if (!url.includes('/login')) { loginOk = true; break; }
    } catch (e) {}
    if (i % 15 === 0 && i > 0) console.log(`  ... 已等待 ${i} 秒`);
  }

  if (!loginOk) {
    console.log('[!] 登录超时');
    await hold();
    return;
  }
  console.log('[3/5] ✅ 登录成功！');

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, 'step2-main.png') });

  // 4. 监听 SSE + 发消息
  const sseBodies = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/chat')) {
      try {
        const body = await resp.text();
        sseBodies.push(body);
        if (body.includes('intent_orch.candidate')) {
          console.log('[SSE] ✅ 检测到 intent_orch.candidate！');
        }
      } catch (e) {}
    }
  });

  console.log('[4/5] 发送测试消息...');
  let input = null;
  for (const sel of ['textarea', 'input[type="text"]', '[contenteditable="true"]']) {
    try {
      input = await page.waitForSelector(sel, { timeout: 5000 });
      if (input) break;
    } catch (e) {}
  }

  if (!input) {
    console.log('[!] 找不到输入框');
    await page.screenshot({ path: path.join(OUT, 'step-error.png') });
    await hold();
    return;
  }

  await input.click();
  await input.fill('你好');
  await new Promise(r => setTimeout(r, 500));

  try {
    const btn = await page.$('button:has-text("发送")') || await page.$('button[type="submit"]');
    if (btn) await btn.click(); else await input.press('Enter');
  } catch (e) {
    await input.press('Enter');
  }
  console.log('[4/5] 📤 已发送');

  // 5. 等回复
  console.log('[5/5] 等待回复（30秒）...');
  await new Promise(r => setTimeout(r, 30000));
  await page.screenshot({ path: path.join(OUT, 'step3-response.png') });

  // 输出结果
  console.log('\n========== SSE 结果 ==========');
  console.log('响应数:', sseBodies.length);
  for (let i = 0; i < sseBodies.length; i++) {
    const b = sseBodies[i];
    console.log(`  [${i}] len=${b.length} intent_orch=${b.includes('intent_orch.candidate')}`);
  }

  // 检查会话存储
  console.log('\n========== 会话存储 ==========');
  const userDir = path.join(__dirname, '..', '.runtime', 'zhitou-chat', 'v2', 'users');
  if (fs.existsSync(userDir)) {
    for (const d of fs.readdirSync(userDir)) {
      if (!d.includes('xuyun') && !d.includes('dobest')) continue;
      const cf = path.join(userDir, d, 'conversations.json');
      if (!fs.existsSync(cf)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
        const convs = data.conversations || data;
        if (!Array.isArray(convs) || !convs.length) continue;
        const latest = convs[convs.length - 1];
        const msgs = latest.messages || [];
        const last = msgs[msgs.length - 1];
        console.log(`用户: ${d} | 消息数: ${msgs.length}`);
        if (last) {
          console.log(`  最后消息: role=${last.role} time=${last.created_at}`);
          const evts = last.metadata?.process_events || [];
          const orch = evts.find(e => e.type?.includes('intent_orch'));
          if (orch) {
            console.log('  ✅ IntentOrch 事件:');
            console.log('    status:', orch.status);
            console.log('    summary:', orch.summary);
            console.log('    duration_ms:', orch.output?.candidate?.duration_ms);
            console.log('    error:', orch.output?.candidate?.error);
          } else {
            console.log('  ❌ 无 IntentOrch 事件');
            console.log('  事件类型:', evts.map(e => e.type).join(', ') || '(无)');
          }
        }
      } catch (e) {
        console.log(`  读取错误: ${e.message}`);
      }
    }
  }

  console.log('\n✅ 完成！浏览器保持 60 秒');
  await new Promise(r => setTimeout(r, 60000));
  await context.close();
})().catch(async (err) => {
  console.error('[TOP-LEVEL ERROR]', err.message);
  await hold();
});
