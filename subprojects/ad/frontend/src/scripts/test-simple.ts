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
  console.log('Current URL:', page.url());

  // Simple test: just fetch and return status
  const result = await page.evaluate(async () => {
    try {
      const resp = await window.fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '你好', intent: 'general_chat', history: [], metadata: {} }),
        signal: AbortSignal.timeout(30000),
      });
      return { status: resp.status, ok: resp.ok };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Result:', JSON.stringify(result));
  await browser.close();
}

main().catch(console.error);
