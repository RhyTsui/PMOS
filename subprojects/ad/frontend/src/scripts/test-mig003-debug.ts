import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const AUTH_DIR = path.resolve('.auth');
const loginState = JSON.parse(readFileSync(path.join(AUTH_DIR, 'login-state.json'), 'utf8'));
const OUTPUT_PATH = path.join(AUTH_DIR, 'mig003-sse-debug.json');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: loginState });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const chatResponse = await page.evaluate(async () => {
    const response = await window.fetch('/api/chat', {
      signal: AbortSignal.timeout(180000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conversation-id': 'mig003-debug2-' + Math.random().toString(36).slice(2, 8),
        'x-pathname': '/debug',
      },
      body: JSON.stringify({
        message: 'https://open.oceanengine.com/labels/7 监测回传文档在哪',
        intent: 'general_chat',
        history: [],
        metadata: {},
      }),
    });
    const raw = await response.text();
    return { status: response.status, bodyLength: raw.length, body: raw };
  });

  console.log('Status:', chatResponse.status);
  console.log('Body length:', chatResponse.bodyLength, 'chars');

  // Save full response
  writeFileSync(OUTPUT_PATH, JSON.stringify({
    status: chatResponse.status,
    bodyLength: chatResponse.bodyLength,
    body: chatResponse.body,
  }, null, 2), 'utf8');
  console.log(`Full response saved to ${OUTPUT_PATH}`);

  // Parse and summarize SSE events
  const events = chatResponse.body
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(Boolean)
    .flatMap(block =>
      block.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('data:'))
        .map(line => {
          try { return JSON.parse(line.slice(5).trim()); } catch { return null; }
        })
        .filter(Boolean)
    );

  console.log(`\nTotal SSE events: ${events.length}`);

  let contentAccumulated = '';
  for (const event of events) {
    const type = event.type || 'unknown';
    if (type === 'content') {
      contentAccumulated += event.content || '';
    }
  }

  console.log(`Content accumulated: ${contentAccumulated.length} chars`);
  if (contentAccumulated.length > 0) {
    console.log(`Content preview: ${contentAccumulated.slice(0, 300)}`);
  }

  // Check done event
  const doneEvent = events.find(e => e.type === 'done');
  if (doneEvent) {
    console.log('\nDone event metadata keys:', Object.keys(doneEvent.metadata || {}));
    const contract = (doneEvent.metadata?.response_contract as Record<string, unknown>) || {};
    console.log('Response contract status:', contract.status);
    console.log('Response contract answer length:', String(contract.answer || '').length);
  } else {
    console.log('\nNo done event found!');
    // Show last few events
    console.log('Last 3 events:');
    for (const e of events.slice(-3)) {
      console.log(`  [${e.type}] ${JSON.stringify(e).slice(0, 200)}`);
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
