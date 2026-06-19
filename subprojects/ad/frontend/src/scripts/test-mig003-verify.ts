import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const AUTH_DIR = path.resolve('.auth');
const loginState = JSON.parse(readFileSync(path.join(AUTH_DIR, 'login-state.json'), 'utf8'));

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: loginState });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Test MIG-003 via API
  const result = await page.evaluate(async () => {
    const response = await window.fetch('/api/chat', {
      signal: AbortSignal.timeout(180000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conversation-id': 'mig003-verify-' + Math.random().toString(36).slice(2, 8),
      },
      body: JSON.stringify({
        message: 'https://open.oceanengine.com/labels/7 监测回传文档在哪',
        intent: 'general_chat',
        history: [],
        metadata: {},
      }),
    });
    const raw = await response.text();
    const events = raw.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
      .flatMap(b => b.split('\n').map(l => l.trim()).filter(l => l.startsWith('data:'))
        .map(l => { try { return JSON.parse(l.slice(5).trim()); } catch { return null; } }).filter(Boolean));

    let content = '';
    events.forEach(e => { if (e.type === 'content') content += e.content || ''; });
    const done = events.find(e => e.type === 'done');
    const errors = events.filter(e => e.type === 'error');
    const rc = done?.metadata?.response_contract || {};

    return {
      status: response.status,
      contentLength: content.length,
      contentPreview: content.slice(0, 200),
      rcStatus: rc.status,
      rcAnswerMarkdown: (rc.answer_markdown || '').slice(0, 100),
      errorCount: errors.length,
      errorMessages: errors.map(e => e.message || e.error),
    };
  });

  console.log('Status:', result.status);
  console.log('Content length:', result.contentLength);
  console.log('Content preview:', result.contentPreview);
  console.log('RC status:', result.rcStatus);
  console.log('RC answer_markdown:', result.rcAnswerMarkdown);
  console.log('Errors:', result.errorCount);
  result.errorMessages.forEach(e => console.log('  Error:', e));

  const passed = result.contentLength > 50 && result.rcStatus === 'success' && result.errorCount === 0;
  console.log('\nMIG-003 verify:', passed ? '✅ PASS' : '❌ FAIL');

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
