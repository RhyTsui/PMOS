import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as XLSX from 'xlsx';
import { chromium, type Page, type Response } from 'playwright';

const SHEET_DEFAULT = '广告业务测试集';
const DEFAULT_BASE_URL = 'http://10.236.14.27:8002';
const CHAT_RESPONSE_TIMEOUT_MS = 120_000;

interface ParsedArgs {
  input: string;
  sheet: string;
  batchId: string;
  outputDir: string;
  baseUrl: string;
}

interface ParsedCase {
  rowIndex: number;
  caseId: string;
  priority: string;
  domain: string;
  scenario: string;
  prompt: string;
  expected: string;
}

interface ExecutionResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  answer: string;
  traceId: string;
  traceUrl: string;
  durationMs: number;
  error?: string;
}

const COL_CASE_ID = '用例ID';
const COL_PRIORITY = '优先级';
const COL_DOMAIN = '业务域';
const COL_SCENARIO = '测试场景';
const COL_PROMPT = '测试输入Prompt';
const COL_EXPECTED = '预期结果';

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const item = args[i];
    if (!item.startsWith('--')) continue;
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      map.set(item, next);
      i += 1;
    } else {
      map.set(item, '');
    }
  }
  return {
    input: map.get('--input') || '',
    sheet: map.get('--sheet') || SHEET_DEFAULT,
    batchId: map.get('--batch') || `T-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    outputDir: map.get('--output-dir') || '',
    baseUrl: map.get('--base-url') || DEFAULT_BASE_URL,
  };
}

function nowStamp(): string {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
}

function parseRows(inputPath: string, sheetName: string): ParsedCase[] {
  const wb = XLSX.readFile(inputPath);
  const sheet = wb.Sheets[sheetName];
  assert(sheet, `sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  assert(Array.isArray(grid) && grid.length >= 2, 'empty workbook');
  const header = (grid[0] as unknown[]).map((cell) => String(cell ?? '').trim());

  const idx = (col: string) => {
    const i = header.indexOf(col);
    assert(i >= 0, `column missing: ${col}`);
    return i;
  };
  const idxCase = idx(COL_CASE_ID);
  const idxPriority = idx(COL_PRIORITY);
  const idxDomain = idx(COL_DOMAIN);
  const idxScenario = header.indexOf(COL_SCENARIO);
  const idxPrompt = idx(COL_PROMPT);
  const idxExpected = idx(COL_EXPECTED);

  const cases: ParsedCase[] = [];
  for (let i = 1; i < grid.length; i += 1) {
    const row = grid[i] as unknown[];
    if (!Array.isArray(row) || row.every((v) => v === '' || v === null || v === undefined)) continue;
    const prompt = String(row[idxPrompt] ?? '').trim();
    if (!prompt) continue;
    cases.push({
      rowIndex: i + 1,
      caseId: String(row[idxCase] ?? ''),
      priority: String(row[idxPriority] ?? ''),
      domain: String(row[idxDomain] ?? ''),
      scenario: idxScenario >= 0 ? String(row[idxScenario] ?? '') : '',
      prompt,
      expected: String(row[idxExpected] ?? ''),
    });
  }
  return cases;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseSsePayloads(raw: string): Array<Record<string, unknown>> {
  return raw
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => {
          try {
            return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter((item): item is Record<string, unknown> => Boolean(item)),
    );
}

function extractTraceFromPayloads(payloads: Array<Record<string, unknown>>): { traceId: string; traceUrl: string } {
  const donePayload = payloads.find((p) => p.type === 'done');
  if (!donePayload) return { traceId: '未返回', traceUrl: '未返回' };
  const metadata = isRecord(donePayload.metadata) ? donePayload.metadata : {};
  const traceMeta = isRecord(metadata.trace_meta) ? metadata.trace_meta : {};
  const traceId = String(
    (metadata.message_id ?? metadata.trace_id ?? metadata.turn_id ?? metadata.messageId ?? traceMeta.trace_id ?? traceMeta.sdk_trace_id ?? traceMeta.local_trace_id) || '未返回',
  );
  const traceUrl = String(metadata.trace_url ?? traceMeta.trace_url ?? '未返回');
  return { traceId, traceUrl };
}

function extractAnswerFromPayloads(payloads: Array<Record<string, unknown>>): string {
  let answer = '';
  for (const payload of payloads) {
    if (payload.type === 'content' && typeof payload.content === 'string') {
      answer += payload.content;
    }
  }
  if (!answer) {
    const donePayload = payloads.find((p) => p.type === 'done');
    if (isRecord(donePayload)) {
      const result = donePayload.result;
      if (isRecord(result)) {
        answer = String(result.answer ?? result.content ?? result.message ?? result.summary ?? '');
      }
      if (!answer && typeof donePayload.content === 'string') answer = donePayload.content;
    }
  }
  return answer.trim();
}

function isMatchExpected(actual: string, expected: string): boolean {
  if (!expected.trim()) return Boolean(actual.trim());
  const keywords = expected.split(/[,，;；|、\s]+/).map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) return Boolean(actual.trim());
  if (keywords.length === 1) return actual.includes(keywords[0]);
  const matched = keywords.filter(kw => actual.includes(kw));
  return matched.length / keywords.length >= 0.8;
}

async function waitForUserConfirmation(message: string): Promise<void> {
  const rl = readline.createInterface({ input, output });
  await rl.question(message);
  rl.close();
}

async function executeCase(page: Page, item: ParsedCase): Promise<ExecutionResult> {
  const start = Date.now();

  let sseBody = '';
  const responsePromise = new Promise<string>((resolve) => {
    const handler = async (response: Response) => {
      if (!response.url().includes('/api/chat')) return;
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) return;
      try {
        const body = await response.text();
        sseBody = body;
        resolve(body);
      } catch {
        resolve('');
      }
      page.off('response', handler);
    };
    page.on('response', handler);
    setTimeout(() => resolve(''), CHAT_RESPONSE_TIMEOUT_MS);
  });

  try {
    const textarea = page.locator('textarea[data-composer-control="input"]');
    await textarea.waitFor({ state: 'visible', timeout: 10_000 });
    await textarea.fill(item.prompt);
    await page.waitForTimeout(300);

    const sendBtn = page.locator('button[data-composer-control="send"]');
    await sendBtn.click();

    const rawSse = await responsePromise;

    if (!rawSse) {
      await page.waitForTimeout(5_000);
      if (sseBody) {
        // Fallback: use whatever was collected
      } else {
        return {
          status: 'ERROR',
          answer: '',
          traceId: '未返回',
          traceUrl: '未返回',
          durationMs: Date.now() - start,
          error: '超时：未收到 /api/chat 响应',
        };
      }
    }

    const body = sseBody || rawSse;
    const payloads = parseSsePayloads(body);
    const trace = extractTraceFromPayloads(payloads);
    let answer = extractAnswerFromPayloads(payloads);

    if (!answer) {
      await page.waitForTimeout(2_000);
      const lastMsg = page.locator('[data-message-role="assistant"]').last();
      if (await lastMsg.isVisible()) {
        answer = (await lastMsg.textContent()) || '';
      }
    }

    const durationMs = Date.now() - start;
    const status = isMatchExpected(answer, item.expected) ? 'PASS' : 'FAIL';

    return { status, answer, traceId: trace.traceId, traceUrl: trace.traceUrl, durationMs };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      status: 'ERROR',
      answer: '',
      traceId: '未返回',
      traceUrl: '未返回',
      durationMs: Date.now() - start,
      error: msg,
    };
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function generateMarkdown(
  cases: ParsedCase[],
  results: Map<number, ExecutionResult>,
  batchId: string,
  inputFile: string,
): string {
  const total = cases.length;
  let pass = 0;
  let fail = 0;
  let error = 0;
  let totalDuration = 0;

  for (const c of cases) {
    const r = results.get(c.rowIndex);
    if (!r) { error += 1; continue; }
    if (r.status === 'PASS') pass += 1;
    else if (r.status === 'FAIL') fail += 1;
    else error += 1;
    totalDuration += r.durationMs;
  }

  const passRate = total ? ((pass / total) * 100).toFixed(1) : '0';
  const avgDuration = total ? Math.round(totalDuration / total) : 0;

  const lines: string[] = [];
  lines.push('# 小乔智投测试报告');
  lines.push('');
  lines.push('## 测试概览');
  lines.push('');
  lines.push(`| 指标 | 值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 批次号 | ${batchId} |`);
  lines.push(`| 测试文件 | ${path.basename(inputFile)} |`);
  lines.push(`| 执行时间 | ${new Date().toISOString().replace('T', ' ').slice(0, 19)} |`);
  lines.push(`| 总用例数 | ${total} |`);
  lines.push(`| 通过 | ${pass} |`);
  lines.push(`| 失败 | ${fail} |`);
  lines.push(`| 异常 | ${error} |`);
  lines.push(`| 通过率 | ${passRate}% |`);
  lines.push(`| 平均耗时 | ${avgDuration}ms |`);
  lines.push('');

  // Domain stats
  const domainMap = new Map<string, { total: number; pass: number; fail: number; error: number }>();
  for (const c of cases) {
    const domain = c.domain || '未分类';
    if (!domainMap.has(domain)) domainMap.set(domain, { total: 0, pass: 0, fail: 0, error: 0 });
    const d = domainMap.get(domain)!;
    d.total += 1;
    const r = results.get(c.rowIndex);
    if (r?.status === 'PASS') d.pass += 1;
    else if (r?.status === 'FAIL') d.fail += 1;
    else d.error += 1;
  }

  lines.push('## 按业务域统计');
  lines.push('');
  lines.push('| 业务域 | 总数 | 通过 | 失败 | 异常 | 通过率 |');
  lines.push('|--------|------|------|------|------|--------|');
  for (const [domain, stats] of domainMap.entries()) {
    const rate = stats.total ? ((stats.pass / stats.total) * 100).toFixed(1) : '0';
    lines.push(`| ${domain} | ${stats.total} | ${stats.pass} | ${stats.fail} | ${stats.error} | ${rate}% |`);
  }
  lines.push('');

  // Problem classification
  const problems = { timeout: 0, mismatch: 0, apiError: 0, noResponse: 0 };
  for (const c of cases) {
    const r = results.get(c.rowIndex);
    if (!r || r.status === 'PASS') continue;
    if (r.error?.includes('超时')) problems.timeout += 1;
    else if (r.error) problems.apiError += 1;
    else if (!r.answer) problems.noResponse += 1;
    else problems.mismatch += 1;
  }

  lines.push('## 问题分类汇总');
  lines.push('');
  lines.push(`| 问题类型 | 数量 |`);
  lines.push(`|----------|------|`);
  lines.push(`| 超时无响应 | ${problems.timeout} |`);
  lines.push(`| 回复不匹配预期 | ${problems.mismatch} |`);
  lines.push(`| 接口/执行异常 | ${problems.apiError} |`);
  lines.push(`| 空回复 | ${problems.noResponse} |`);
  lines.push('');

  // Detailed results table
  lines.push('## 详细结果');
  lines.push('');
  lines.push('| 用例ID | 优先级 | 业务域 | Prompt | 回复摘要 | traceId | 状态 | 耗时(ms) |');
  lines.push('|--------|--------|--------|--------|----------|---------|------|----------|');
  for (const c of cases) {
    const r = results.get(c.rowIndex);
    const status = r?.status || 'ERROR';
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const answerPreview = truncateText((r?.answer || r?.error || '').replace(/\n/g, ' '), 40);
    const promptPreview = truncateText(c.prompt.replace(/\n/g, ' '), 30);
    lines.push(`| ${c.caseId} | ${c.priority} | ${c.domain} | ${promptPreview} | ${answerPreview} | \`${r?.traceId || '未返回'}\` | ${statusIcon} ${status} | ${r?.durationMs || 0} |`);
  }
  lines.push('');

  // Failed case details
  const failedCases = cases.filter((c) => {
    const r = results.get(c.rowIndex);
    return r && r.status !== 'PASS';
  });

  if (failedCases.length > 0) {
    lines.push('## 失败/异常用例详情');
    lines.push('');
    for (const c of failedCases) {
      const r = results.get(c.rowIndex)!;
      lines.push(`### ${c.caseId} - ${c.domain}`);
      lines.push('');
      lines.push(`- **优先级**: ${c.priority}`);
      lines.push(`- **状态**: ${r.status}`);
      lines.push(`- **traceId**: \`${r.traceId}\``);
      if (r.traceUrl && r.traceUrl !== '未返回') {
        lines.push(`- **traceUrl**: ${r.traceUrl}`);
      }
      lines.push(`- **耗时**: ${r.durationMs}ms`);
      lines.push(`- **输入**: ${c.prompt}`);
      lines.push(`- **预期**: ${c.expected}`);
      lines.push(`- **实际回复**: ${truncateText(r.answer || '(空)', 200)}`);
      if (r.error) lines.push(`- **错误**: ${r.error}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function writeResultExcel(
  inputPath: string,
  sheetName: string,
  cases: ParsedCase[],
  results: Map<number, ExecutionResult>,
  outputPath: string,
): void {
  const wb = XLSX.readFile(inputPath);
  const sheet = wb.Sheets[sheetName];
  assert(sheet, `sheet not found: ${sheetName}`);
  const rowsAoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][];

  const header = (rowsAoa[0] || []).map((cell) => String(cell ?? '').trim());
  const resultIdx = header.indexOf('测试结果');
  let traceIdx = header.indexOf('traceId');
  if (traceIdx < 0) { traceIdx = header.length; header.push('traceId'); }
  let durationIdx = header.indexOf('耗时(ms)');
  if (durationIdx < 0) { durationIdx = header.length; header.push('耗时(ms)'); }
  rowsAoa[0] = header;

  let pass = 0;
  let fail = 0;
  let totalDuration = 0;

  for (const item of cases) {
    const exec = results.get(item.rowIndex);
    if (!exec) continue;
    const row = rowsAoa[item.rowIndex - 1] ? [...(rowsAoa[item.rowIndex - 1] as unknown[])] : [];
    while (row.length < header.length) row.push('');
    if (resultIdx >= 0) row[resultIdx] = exec.status === 'PASS' ? `PASS | 耗时 ${exec.durationMs}ms` : `${exec.status} | ${exec.error || '预期不匹配'}`;
    row[traceIdx] = exec.traceId;
    row[durationIdx] = exec.durationMs;
    rowsAoa[item.rowIndex - 1] = row;
    if (exec.status === 'PASS') pass += 1;
    else fail += 1;
    totalDuration += exec.durationMs;
  }

  const total = cases.length;
  const summaryRows = [
    ['测试批次号', path.basename(outputPath)],
    ['测试文件', path.basename(inputPath)],
    ['测试时间', new Date().toISOString()],
    ['总数', String(total)],
    ['通过', String(pass)],
    ['失败', String(fail)],
    ['通过率', total ? `${((pass / total) * 100).toFixed(2)}%` : '0%'],
    ['平均耗时(ms)', total ? `${Math.round(totalDuration / total)}` : '0'],
  ];
  wb.Sheets['执行汇总'] = XLSX.utils.aoa_to_sheet(summaryRows);
  wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rowsAoa);
  XLSX.writeFile(wb, outputPath);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  assert(args.input, '--input is required');
  const absInput = path.resolve(args.input);
  assert(fs.existsSync(absInput), `input file not found: ${absInput}`);

  const cases = parseRows(absInput, args.sheet);
  assert(cases.length > 0, 'no usable rows in the sheet');
  console.log(`Loaded ${cases.length} test cases from "${args.sheet}"`);

  const outDir = path.resolve(args.outputDir || path.dirname(absInput));
  fs.mkdirSync(outDir, { recursive: true });
  const mdPath = path.join(outDir, `小乔智投测试报告_${args.batchId}_${nowStamp()}.md`);
  const xlsxPath = path.join(outDir, `小乔智投测试结果_${args.batchId}_${nowStamp()}.xlsx`);

  console.log('\nLaunching browser...');
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await page.goto(args.baseUrl, { waitUntil: 'domcontentloaded' });
  console.log(`\n[Playwright] Opened: ${args.baseUrl}`);
  console.log('请在浏览器中完成登录（如需扫码），登录成功后回到终端按回车继续...');
  await waitForUserConfirmation('登录完成后按回车继续...');

  await page.waitForTimeout(2_000);
  console.log(`\nStarting execution of ${cases.length} cases...\n`);

  const results = new Map<number, ExecutionResult>();

  for (let i = 0; i < cases.length; i += 1) {
    const item = cases[i];
    console.log(`[${i + 1}/${cases.length}] ${item.caseId} | ${truncateText(item.prompt, 40)}`);

    const result = await executeCase(page, item);
    results.set(item.rowIndex, result);

    const statusLabel = result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⚠️ ERROR';
    console.log(`  → ${statusLabel} | traceId: ${result.traceId} | ${result.durationMs}ms`);

    // Write incremental output
    const md = generateMarkdown(cases, results, args.batchId, absInput);
    fs.writeFileSync(mdPath, md, 'utf8');

    // Wait between cases to avoid overwhelming the server
    if (i < cases.length - 1) {
      await page.waitForTimeout(1_500);
    }
  }

  // Final Excel output
  writeResultExcel(absInput, args.sheet, cases, results, xlsxPath);

  await browser.close();

  const pass = [...results.values()].filter((r) => r.status === 'PASS').length;
  console.log(`\n========== 执行完成 ==========`);
  console.log(`通过率: ${((pass / cases.length) * 100).toFixed(1)}% (${pass}/${cases.length})`);
  console.log(`Markdown 报告: ${mdPath}`);
  console.log(`Excel 结果: ${xlsxPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
