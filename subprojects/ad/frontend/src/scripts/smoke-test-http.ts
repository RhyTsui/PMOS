/**
 * Smoke test: 10 representative cases via HTTP direct call.
 * Usage: npx tsx scripts/smoke-test-http.ts [--endpoint URL] [--cookie COOKIE]
 */

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8002/api/chat';
const TIMEOUT_MS = 60_000;

interface SmokeCase {
  id: string;
  prompt: string;
  expectedKeywords: string[];
  category: 'general' | 'report_query' | 'knowledge' | 'diagnosis';
}

const SMOKE_CASES: SmokeCase[] = [
  { id: 'S01', prompt: '你好', expectedKeywords: [], category: 'general' },
  { id: 'S02', prompt: '帮我查一下昨天的消耗', expectedKeywords: ['消耗'], category: 'report_query' },
  { id: 'S03', prompt: '最近7天的激活趋势', expectedKeywords: ['激活'], category: 'report_query' },
  { id: 'S04', prompt: '今天ROI是多少', expectedKeywords: ['ROI'], category: 'report_query' },
  { id: 'S05', prompt: '对比一下安卓和iOS的注册成本', expectedKeywords: ['注册'], category: 'report_query' },
  { id: 'S06', prompt: '上周按媒体维度看消耗分布', expectedKeywords: ['消耗', '媒体'], category: 'report_query' },
  { id: 'S07', prompt: '帮我诊断一下为什么昨天消耗突然升高', expectedKeywords: ['消耗'], category: 'diagnosis' },
  { id: 'S08', prompt: '什么是ARPPU', expectedKeywords: ['ARPPU'], category: 'knowledge' },
  { id: 'S09', prompt: '次留率的计算公式是什么', expectedKeywords: ['留存'], category: 'knowledge' },
  { id: 'S10', prompt: '查看本月按日的付费趋势', expectedKeywords: ['付费'], category: 'report_query' },
];

function parseArgs(): { endpoint: string; cookie: string } {
  const args = process.argv.slice(2);
  let endpoint = DEFAULT_ENDPOINT;
  let cookie = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--endpoint' && args[i + 1]) endpoint = args[++i];
    if (args[i] === '--cookie' && args[i + 1]) cookie = args[++i];
  }
  return { endpoint, cookie };
}

function parseSseContent(raw: string): string {
  const lines = raw.split('\n');
  let content = '';
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;
    try {
      const payload = JSON.parse(jsonStr);
      if (payload.type === 'content' && typeof payload.content === 'string') {
        content += payload.content;
      }
    } catch { /* skip non-json lines */ }
  }
  return content;
}

async function runCase(c: SmokeCase, endpoint: string, cookie: string): Promise<{
  id: string;
  pass: boolean;
  durationMs: number;
  response: string;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pathname': '/smoke-test',
        'x-conversation-id': `smoke-${c.id}-${Date.now()}`,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ message: c.prompt, history: [], intent: 'general_chat', metadata: { smokeTest: true } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const raw = await res.text();
    const content = parseSseContent(raw) || raw;
    const durationMs = Date.now() - start;
    const hasResponse = content.trim().length > 0;
    const keywordsPass = c.expectedKeywords.length === 0
      || c.expectedKeywords.some(kw => content.includes(kw));
    const pass = hasResponse && keywordsPass;
    return { id: c.id, pass, durationMs, response: content.slice(0, 200) };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { id: c.id, pass: false, durationMs: Date.now() - start, response: '', error: msg };
  }
}

async function main() {
  const { endpoint, cookie } = parseArgs();
  console.log(`Smoke test: ${SMOKE_CASES.length} cases → ${endpoint}\n`);

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const c of SMOKE_CASES) {
    const r = await runCase(c, endpoint, cookie);
    const icon = r.pass ? 'PASS' : 'FAIL';
    const line = `[${icon}] ${r.id} (${c.category}) "${c.prompt}" — ${r.durationMs}ms${r.error ? ` ERROR: ${r.error}` : ''}`;
    console.log(line);
    if (!r.pass && !r.error) {
      console.log(`       response: ${r.response.slice(0, 100)}`);
    }
    results.push(line);
    if (r.pass) passed++;
    else failed++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${SMOKE_CASES.length} | Pass: ${passed} | Fail: ${failed} | Rate: ${Math.round(passed / SMOKE_CASES.length * 100)}%`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

export {};
