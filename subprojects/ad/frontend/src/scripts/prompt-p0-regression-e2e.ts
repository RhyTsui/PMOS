import { chromium, type Browser, type Page } from 'playwright';

const BASE_URL = process.env.XIAOQIAO_E2E_URL || 'http://127.0.0.1:8002';
const LOGIN_WAIT_MS = 180000;
const PER_CHAT_TIMEOUT_MS = 120000;

interface ScenarioResult {
  label: string;
  elapsed: string;
  intent: string;
  serviceIntent: string;
  isReport: boolean;
  answer: string;
  prompts: Record<string, { source: string; version: number; fallback: boolean }>;
  webStatus: string;
  domainContext: string;
  status: 'pass' | 'fail' | 'timeout' | 'error';
  error?: string;
}

async function main() {
  console.log('=== 提示词治理全流程 E2E 验证 ===');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Per-chat timeout: ${PER_CHAT_TIMEOUT_MS / 1000}s`);

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // 1. 登录
    console.log('\n[1] 打开登录页...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`    URL: ${page.url()}`);

    if (page.url().includes('/login')) {
      console.log(`\n⏳ 请在 ${LOGIN_WAIT_MS / 1000} 秒内扫码登录...`);
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: LOGIN_WAIT_MS, waitUntil: 'domcontentloaded',
      });
      console.log(`    ✅ 登录成功: ${page.url()}`);
    } else {
      console.log('    ✅ 已登录');
    }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 2. 定义 5 个场景
    const scenarios = [
      { name: '场景1: 通用聊天', message: '你好', expectedIntent: 'general' },
      { name: '场景2: 问数', message: '昨天巨量消耗多少', expectedIntent: 'report_query' },
      { name: '场景3: 公开联网', message: '现在北京天气如何', expectedIntent: 'general', expectWeb: true },
      { name: '场景4: 使用帮助', message: 'ROI是什么意思', expectedIntent: 'help' },
      { name: '场景5: 问题排查', message: '昨天消耗异常下跌怎么排查', expectedIntent: 'diagnosis' },
    ];

    console.log('\n[2] 开始跑 5 个场景...\n');
    const results: ScenarioResult[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      console.log(`--- ${s.name}: "${s.message}" ---`);
      const r = await runChat(page, s.message, PER_CHAT_TIMEOUT_MS);
      r.label = s.name;

      const icon = r.status === 'pass' ? '✅' : r.status === 'timeout' ? '⏱️' : '❌';
      console.log(`  ${icon} elapsed=${r.elapsed}`);
      console.log(`     intent=${r.intent} service=${r.serviceIntent} isReport=${r.isReport}`);
      console.log(`     answer: ${r.answer.slice(0, 80)}`);
      console.log(`     web: ${r.webStatus || '(未触发)'}`);
      if (r.domainContext) console.log(`     domain_context: ${r.domainContext.slice(0, 60)}...`);
      const pc = Object.keys(r.prompts).length;
      const allRuntime = pc > 0 && Object.values(r.prompts).every(p => p.source === 'runtime');
      console.log(`     prompts: ${pc}个, 全部runtime=${allRuntime}`);
      for (const [k, v] of Object.entries(r.prompts).slice(0, 3)) {
        console.log(`       ${k}: src=${v.source} v=${v.version} fb=${v.fallback}`);
      }
      if (pc > 3) console.log(`       ... 等${pc}个`);
      console.log('');

      results.push(r);
      if (i < scenarios.length - 1) {
        console.log('  ⏳ 等待 10s 避免限流...\n');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    // 3. 汇总
    console.log('\n=== 汇总 ===');
    for (const r of results) {
      const icon = r.status === 'pass' ? '✅' : r.status === 'timeout' ? '⏱️' : '❌';
      const pc = Object.keys(r.prompts).length;
      const allRt = pc > 0 && Object.values(r.prompts).every(p => p.source === 'runtime');
      console.log(`${icon} ${r.label} (${r.elapsed})`);
      console.log(`   intent=${r.intent} service=${r.serviceIntent} isReport=${r.isReport}`);
      console.log(`   prompts=${pc} allRuntime=${allRt} web=${r.webStatus || '-'}`);
      if (r.domainContext) console.log(`   domain_context=✅ (${r.domainContext.slice(0, 50)}...)`);
    }

    const passed = results.filter(r => r.status === 'pass').length;
    console.log(`\n结果: ${passed}/${results.length} 通过`);

    console.log('\n浏览器保持打开 60 秒...');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    console.error('\n❌ FATAL:', error instanceof Error ? error.message : String(error));
    console.log('浏览器保持打开 60 秒');
    await new Promise(r => setTimeout(r, 60000));
  } finally {
    if (browser) await browser.close();
  }
}

async function runChat(page: Page, message: string, timeoutMs: number): Promise<ScenarioResult> {
  const convId = `conv-prompt-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const result = await page.evaluate(async (args: { message: string; convId: string; timeoutMs: number }) => {
    const start = Date.now();
    try {
      const response = await window.fetch('/api/chat', {
        signal: AbortSignal.timeout(args.timeoutMs),
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-conversation-id': args.convId },
        body: JSON.stringify({ message: args.message, history: [], metadata: {} }),
      });

      const text = await response.text();
      const events = text.split('\n')
        .filter(l => l.trim().startsWith('data:'))
        .map(l => { try { return JSON.parse(l.trim().slice(5)); } catch { return null; } })
        .filter(Boolean);

      let intent = '', serviceIntent = '', isReport = false, answer = '', webStatus = '', domainContext = '';
      const prompts: Record<string, { source: string; version: number; fallback: boolean }> = {};

      for (const evt of events) {
        if (evt?.type === 'process_event') {
          const e = evt.event;
          if (e?.type === 'intent.detected') {
            intent = e.output?.resolvedIntent || e.output?.intent_type || '';
            serviceIntent = e.output?.serviceIntent || '';
            isReport = e.output?.isReportQuery || false;
          }
          if (e?.type === 'route_observation') {
            const pr = e.output?.promptRuntime;
            if (pr?.slots) {
              for (const [k, v] of Object.entries(pr.slots) as [string, any][]) {
                if (v?.promptSource) {
                  prompts[k] = { source: v.promptSource, version: v.activePromptVersion, fallback: v.seedFallbackUsed ?? false };
                }
              }
            }
          }
          if (e?.type === 'web.search') {
            webStatus = `${e.status}/${e.output?.capability_status || e.output?.provider_unavailable_reason || ''}`;
          }
        }
        if (evt?.type === 'content' && evt.content) answer += evt.content;
      }

      return {
        elapsed: ((Date.now() - start) / 1000).toFixed(1),
        intent, serviceIntent, isReport, answer, webStatus, domainContext, prompts,
        status: 'pass' as const,
      };
    } catch (e: any) {
      return {
        elapsed: ((Date.now() - start) / 1000).toFixed(1),
        intent: '', serviceIntent: '', isReport: false, answer: '', webStatus: '', domainContext: '', prompts: {},
        status: e?.name === 'TimeoutError' ? 'timeout' as const : 'error' as const,
        error: e?.message || String(e),
      };
    }
  }, { message, convId, timeoutMs });

  return { label: '', ...result };
}

main().catch(e => { console.error('Unhandled:', e); process.exit(1); });
