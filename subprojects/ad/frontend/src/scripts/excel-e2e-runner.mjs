/**
 * 小乔智投测试集 v1.1 — 全量 E2E Runner
 *
 * 改进：
 *   1. 全量用例（从 Excel 行号跑，支持所有 MIG-xxx 和 MIG-FBK-xxx）
 *   2. 每条用例截图（发送前 + 回复后）
 *   3. 精准抓取 assistant 消息气泡内容（排除侧边栏噪声）
 *   4. 完整 JSON 日志
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.resolve(__dirname, '..', '.auth', 'pw-data');
const BASE_URL = process.env.E2E_BASE_URL || 'http://10.236.14.27:8002';
const EXCEL_PATH = process.env.E2E_EXCEL_PATH || 'E:/AI/ai-os/docs/sources/inbox/0620/小乔智投测试集v1.1.xlsx';
const RESULT_DIR = path.resolve(__dirname, '..', '.auth', 'e2e-results');
const SCREENSHOT_DIR = path.join(RESULT_DIR, 'screenshots');
const PER_CASE_TIMEOUT_MS = 180_000;
const LOGIN_WAIT_MS = 300_000;

// CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const m = arg.match(/^--(\w+)=(.*)$/);
  if (m) acc[m[1]] = m[2];
  else if (arg.startsWith('--')) acc[arg.slice(2)] = true;
  return acc;
}, {});
const FROM_ROW = args.from ? parseInt(args.from) : 0; // 0-based row index
const SINGLE_CASE = args.case || null;
const DRY_RUN = !!args.dry;
const SKIP_MULTITURN = !!args['skip-multiturn'];

function ensureDirs() {
  [USER_DATA_DIR, RESULT_DIR, SCREENSHOT_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

/**
 * Check if server is healthy; if not, restart it
 */
let serverProcess = null;
async function ensureServerHealthy() {
  const http = await import('node:http');
  const { spawn } = await import('node:child_process');

  const isUp = await new Promise(resolve => {
    const req = http.get(`${BASE_URL}/`, { timeout: 3000 }, res => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });

  if (isUp) return;

  console.log('[server] ⚠ Server down, restarting...');
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch {}
    serverProcess = null;
  }
  // Also kill any existing pnpm dev
  try { require('child_process').execSync('taskkill /F /FI "WINDOWTITLE eq *server.ts*" 2>nul', { stdio: 'ignore' }); } catch {}

  const serverDir = path.resolve(__dirname, '..');
  serverProcess = spawn('pnpm', ['dev'], {
    cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: true,
  });
  serverProcess.unref();

  // Wait for server to come up
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const check = await new Promise(resolve => {
      const req = http.get(`${BASE_URL}/`, { timeout: 3000 }, res => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    if (check) {
      console.log(`[server] ✅ Server back up after ${(i + 1) * 2}s`);
      return;
    }
  }
  throw new Error('Server failed to restart after 60s');
}

function readTestCases() {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets['广告业务测试集'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // Skip header row
  const cases = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = (row[0] || '').toString().trim();
    const scene = (row[1] || '').toString().trim();
    const prompt = (row[2] || '').toString().trim();
    const key = (row[3] || '').toString().trim();
    // Skip rows with no prompt
    if (!prompt) continue;
    // Build a unique label from row index
    const label = id || `ROW-${i}`;
    cases.push({ rowIndex: i, id, label, scene, prompt, key });
  }
  // Filter
  if (SINGLE_CASE) return cases.filter(c => c.id === SINGLE_CASE || c.label === SINGLE_CASE);
  if (FROM_ROW > 0) return cases.filter(c => c.rowIndex >= FROM_ROW);
  return cases;
}

async function ensureLoggedIn(page) {
  // Pre-flight: wait until server responds to HTTP consistently
  const http = await import('node:http');
  console.log('[auth] Waiting for server to stabilize...');
  let stableCount = 0;
  for (let i = 0; i < 60; i++) {
    const ok = await new Promise(resolve => {
      const req = http.get(`${BASE_URL}/`, { timeout: 5000 }, res => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    if (ok) {
      stableCount++;
      if (stableCount >= 3) {
        console.log(`[auth] Server stable after ${(i + 1)}s`);
        break;
      }
    } else {
      stableCount = 0;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (stableCount < 3) throw new Error('Server not stable after 60s');

  // Retry goto a few times (Next.js dev compilation can block initial load)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      break;
    } catch (e) {
      console.log(`[auth] goto attempt ${attempt} failed: ${e.message.slice(0, 60)}`);
      if (attempt === 3) throw e;
      await page.waitForTimeout(5000);
    }
  }
  await page.waitForFunction(() => {
    const compiling = document.querySelector('[class*="compiling"], [class*="Compiling"]');
    return !compiling;
  }, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  请在弹出的 Google Chrome 窗口中扫码登录                ║');
    console.log('║  （Alt+Tab 切换窗口）最长等待 5 分钟                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: LOGIN_WAIT_MS, waitUntil: 'domcontentloaded',
    });
    console.log('[auth] 登录成功！');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    console.log('[auth] 复用已有登录态');
  }
}

async function startNewConversation(page) {
  const selectors = [
    'button:has-text("新建对话")',
    'button:has-text("新对话")',
    'button:has-text("新建")',
    'button[aria-label*="新"]',
    'button[title*="新"]',
    '[data-testid="new-conversation"]',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      // Wait for conversation area to be ready
      await page.locator('.conversation-scroll-area').waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
      return;
    }
  }
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await page.locator('.conversation-scroll-area').waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
}

async function findInput(page) {
  const selectors = [
    'textarea[data-testid="chat-input"]',
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="问"]',
    'textarea',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 800 }).catch(() => false)) return el;
  }
  return null;
}

async function sendMessage(page, message) {
  const input = await findInput(page);
  if (!input) throw new Error('未找到消息输入框');
  await input.click();
  await input.fill(message);
  await page.waitForTimeout(300);
  const sendBtns = [
    'button[data-testid="send-button"]',
    'button[aria-label*="发送"]',
    'button[title*="发送"]',
    'button[type="submit"]',
    'button:has-text("发送")',
  ];
  for (const sel of sendBtns) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      return;
    }
  }
  await input.press('Enter');
}

/**
 * 抓取对话区内容（排除侧边栏）
 * 整个对话（用户消息+中间步骤+AI回复）在同一个 conversation-scroll-area 内
 */
async function getConversationContent(page) {
  return page.evaluate(() => {
    // Primary: conversation-scroll-area (excludes sidebar)
    const scrollArea = document.querySelector('.conversation-scroll-area');
    if (scrollArea) {
      const raw = (scrollArea.innerText || '').trim();
      return { source: 'conversation-scroll-area', text: raw };
    }
    // Fallback: workspace
    const workspace = document.querySelector('.xiaoqiao-chat-workspace-bg');
    if (workspace) {
      return { source: 'workspace', text: (workspace.innerText || '').trim().slice(0, 8000) };
    }
    return { source: 'none', text: '' };
  });
}

/**
 * 从对话区全文中过滤系统噪声，提取 AI 实质回复
 */
function extractAssistantReply(rawText) {
  const noisePatterns = [
    // System step indicators
    '进入意图理解阶段',
    '进入候选规划阶段',
    'IntentOrch 候选',
    '进入执行阶段',
    '进入结果组装阶段',
    // Processing status
    /已处理 \d+ 步[^\n]*/g,
    /用时 \d+s/g,
    /当前时间为[^。\n]*。?/g,
    // Model name lines
    /qwen[\w.-]+/gi,
    '保护用户隐私和公司数据是员工责任，禁止向无权限者提供敏感信息。',
    // UI chrome
    '停止生成',
    '已返回当前可用结果',
    '当前没有取得可验证的公开来源结果，因此不能把它当作已确认结论。',
  ];
  let cleaned = rawText;
  for (const p of noisePatterns) {
    if (p instanceof RegExp) {
      cleaned = cleaned.replace(p, '');
    } else {
      cleaned = cleaned.split(p).join('');
    }
  }
  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n').replace(/[ \t]+/g, ' ').trim();
  return cleaned;
}

async function waitForResponse(page, prompt, timeoutMs = PER_CASE_TIMEOUT_MS) {
  const start = Date.now();
  let lastRawText = '';
  let stableCount = 0;
  // The raw text must exceed the prompt length before we consider it "has response"
  const minResponseLength = (prompt || '').length + 30;

  while (Date.now() - start < timeoutMs) {
    const conv = await getConversationContent(page);
    const rawText = conv.text || '';

    if (rawText.length > minResponseLength && rawText !== lastRawText) {
      lastRawText = rawText;
      stableCount = 0;
    } else if (rawText === lastRawText && rawText.length > minResponseLength) {
      stableCount++;
      const required = rawText.length > 500 ? 6 : 4;
      if (stableCount >= required) {
        const cleaned = extractAssistantReply(rawText);
        return { text: cleaned, rawText: rawText, source: conv.source };
      }
    }
    await page.waitForTimeout(1000);
  }
  // Timeout — return whatever we have
  if (lastRawText.length > minResponseLength) {
    const cleaned = extractAssistantReply(lastRawText);
    return { text: cleaned, rawText: lastRawText, source: 'timeout-partial' };
  }
  return { text: '(无回复)', rawText: lastRawText, source: 'timeout' };
}

async function takeScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
  return filePath;
}

async function main() {
  ensureDirs();
  console.log('[init] Excel:', EXCEL_PATH);
  console.log('[init] Base URL:', BASE_URL);
  console.log('[init] Results:', RESULT_DIR);

  const cases = readTestCases();
  console.log(`[init] 共 ${cases.length} 条用例待跑 (from row ${FROM_ROW})`);

  if (DRY_RUN) {
    for (const c of cases) {
      console.log(`  Row ${c.rowIndex} | ${c.label} | ${c.scene} | "${c.prompt.slice(0, 60)}..."`);
    }
    return;
  }

  // Launch Chrome
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();

  try {
    await ensureLoggedIn(page);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const caseStart = Date.now();
      const safeName = `${String(c.rowIndex).padStart(3, '0')}-${(c.id || 'ROW').replace(/[^a-zA-Z0-9-]/g, '_')}`;

      console.log('');
      console.log(`════════════════════════════════════════════════════════════`);
      console.log(`[${i + 1}/${cases.length}] ${c.label} | ${c.scene}`);
      console.log(`Row: ${c.rowIndex} | Prompt: ${c.prompt.slice(0, 100)}`);
      console.log(`────────────────────────────────────────────────────────────`);

      try {
        // Check server health before each case
        await ensureServerHealthy();

        // Start new conversation
        await startNewConversation(page);
        await page.waitForTimeout(500);

        // Screenshot before sending
        await takeScreenshot(page, `${safeName}-before`);

        // Send message
        await sendMessage(page, c.prompt);
        console.log('[send] 消息已发送，等待回复...');

        // Wait for response
        const reply = await waitForResponse(page, c.prompt);
        const elapsed = ((Date.now() - caseStart) / 1000).toFixed(1);

        // Screenshot after response
        const screenshotPath = await takeScreenshot(page, `${safeName}-after`);

        // Extract meaningful content
        const replyText = reply.text;
        const replyClean = replyText
          .replace(/开启新对话|今天|新对话/g, '')
          .replace(/\n{3,}/g, '\n')
          .trim();

        console.log(`[recv] ${elapsed}s | ${replyText.length}字 | source=${reply.source}`);
        console.log(`[recv] 清洁后: ${replyClean.slice(0, 200).replace(/\n/g, ' ')}`);

        // Extract SSE data from conversation store (if accessible)
        let sseData = null;
        try {
          sseData = await page.evaluate(() => {
            // Try to get structured data from the app's state
            const mainArea = document.querySelector('main') || document.body;
            // Look for table/card/chart content
            const tables = mainArea.querySelectorAll('table');
            const tableData = [];
            tables.forEach(t => {
              const rows = [];
              t.querySelectorAll('tr').forEach(tr => {
                const cells = [];
                tr.querySelectorAll('th, td').forEach(td => cells.push((td.innerText || '').trim()));
                rows.push(cells.join(' | '));
              });
              if (rows.length > 0) tableData.push(rows.join('\n'));
            });
            return { tableCount: tables.length, tables: tableData.map(t => t.slice(0, 500)) };
          });
        } catch {}

        results.push({
          rowIndex: c.rowIndex,
          id: c.id,
          label: c.label,
          scene: c.scene,
          prompt: c.prompt,
          expectedKey: c.key,
          reply: replyText.slice(0, 5000),
          replyClean: replyClean.slice(0, 3000),
          replySource: reply.source,
          replyLength: replyText.length,
          elapsed: parseFloat(elapsed),
          screenshotBefore: `${safeName}-before.png`,
          screenshotAfter: `${safeName}-after.png`,
          tables: sseData,
          status: replyText.length > 20 && !replyText.includes('(无回复)') ? 'completed' : 'no_response',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const elapsed = ((Date.now() - caseStart) / 1000).toFixed(1);
        console.log(`[ERROR] ${elapsed}s | ${err.message}`);
        const screenshotPath = await takeScreenshot(page, `${safeName}-error`);

        results.push({
          rowIndex: c.rowIndex,
          id: c.id,
          label: c.label,
          scene: c.scene,
          prompt: c.prompt,
          expectedKey: c.key,
          reply: '',
          replyLength: 0,
          elapsed: parseFloat(elapsed),
          screenshotBefore: `${safeName}-before.png`,
          screenshotAfter: `${safeName}-error.png`,
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Incremental save
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      fs.writeFileSync(
        path.join(RESULT_DIR, 'e2e-full-progress.json'),
        JSON.stringify({ total: cases.length, completed: i + 1, elapsed: `${totalElapsed}s`, results }, null, 2),
        'utf8'
      );
    }

    // Final summary
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('  E2E 全量测试结果汇总');
    console.log('════════════════════════════════════════════════════════════');

    const completed = results.filter(r => r.status === 'completed').length;
    const noResponse = results.filter(r => r.status === 'no_response').length;
    const errors = results.filter(r => r.status === 'error').length;
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log(`总计: ${results.length} | 完成: ${completed} | 无回复: ${noResponse} | 错误: ${errors}`);
    console.log(`总耗时: ${totalTime} 分钟`);
    console.log('');
    for (const r of results) {
      const icon = r.status === 'completed' ? '✓' : r.status === 'error' ? '✗' : '⚠';
      console.log(`  ${icon} [${r.label}] ${r.scene} | ${r.elapsed}s | ${r.replyLength}字 | ${r.status}`);
    }

    // Save final results
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const finalResult = {
      timestamp: new Date().toISOString(),
      excelPath: EXCEL_PATH,
      baseUrl: BASE_URL,
      summary: { total: results.length, completed, noResponse, errors, totalTime: `${totalTime}min` },
      results,
    };
    const jsonFile = path.join(RESULT_DIR, `e2e-full-${ts}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(finalResult, null, 2), 'utf8');
    console.log(`\n[done] JSON: ${jsonFile}`);

    // CSV
    const csvLines = ['Row,用例ID,测试场景,Prompt,状态,耗时(s),回复字数,回复清洁摘要,截图'];
    for (const r of results) {
      csvLines.push([
        r.rowIndex,
        r.id || '',
        `"${(r.scene || '').replace(/"/g, '""')}"`,
        `"${r.prompt.replace(/"/g, '""')}"`,
        r.status,
        r.elapsed,
        r.replyLength,
        `"${(r.replyClean || '').slice(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        r.screenshotAfter || '',
      ].join(','));
    }
    const csvFile = path.join(RESULT_DIR, `e2e-full-${ts}.csv`);
    fs.writeFileSync(csvFile, '﻿' + csvLines.join('\n'), 'utf8');
    console.log(`[done] CSV: ${csvFile}`);
    console.log(`[done] 截图: ${SCREENSHOT_DIR}/`);

  } finally {
    console.log('\n[done] 5 秒后关闭浏览器…');
    await page.waitForTimeout(5000);
    await context.close();
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
