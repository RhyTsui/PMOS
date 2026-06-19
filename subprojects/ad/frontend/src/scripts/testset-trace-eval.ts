import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as XLSX from 'xlsx';
import { chromium } from 'playwright';

const SHEET_DEFAULT = '\u5e7f\u544a\u4e1a\u52a1\u6d4b\u8bd5\u96c6';
const DEFAULT_ENDPOINT = 'http://127.0.0.1:8002/api/chat';
const DEFAULT_LOGIN_URL = 'http://127.0.0.1:8002';

interface ParsedArgs {
  input: string;
  sheet: string;
  batchId: string;
  outputDir: string;
  endpoint: string;
  loginUrl: string;
  usePlaywright: boolean;
}

interface ParsedCase {
  rowIndex: number;
  caseId: string;
  prompt: string;
  expected: string;
}

interface ExecutionResult {
  status: 'PASS' | 'FAIL';
  content: string;
  traceId: string;
  traceUrl: string;
  durationMs: number;
  error?: string;
}

const COL_CASE_ID = '\u7528\u4f8bID';
const COL_PROMPT = '\u6d4b\u8bd5\u8f93\u5165Prompt';
const COL_EXPECTED = '\u9884\u671f\u7ed3\u679c';
const COL_RESULT = '\u6d4b\u8bd5\u7ed3\u679c';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

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
    endpoint: map.get('--endpoint') || DEFAULT_ENDPOINT,
    loginUrl: map.get('--login-url') || DEFAULT_LOGIN_URL,
    usePlaywright: map.has('--playwright'),
  };
}

function nowYYYYMMDDHHMMSS(): string {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
}

function buildOutputPath(inputPath: string, batchId: string, outputDir: string): string {
  const outDir = path.resolve(outputDir || path.dirname(inputPath));
  fs.mkdirSync(outDir, { recursive: true });
  return path.join(outDir, `${path.parse(inputPath).name}_\u6d4b\u8bd5\u6279\u6b21\u53f7_${batchId}_${nowYYYYMMDDHHMMSS()}.xlsx`);
}

function getDonePayloadText(donePayload?: Record<string, unknown>): string {
  if (!donePayload) return '';
  const result = donePayload.result;
  if (isRecord(result) && typeof result.answer === 'string') return result.answer;
  if (isRecord(result) && typeof result.content === 'string') return result.content;
  if (isRecord(result) && typeof result.message === 'string') return result.message;
  if (isRecord(result) && typeof result.summary === 'string') return result.summary;
  if (typeof donePayload.content === 'string') return donePayload.content;
  return '';
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

function extractTrace(donePayload: Record<string, unknown> | undefined): { traceId: string; traceUrl: string } {
  const metadata = isRecord(donePayload?.metadata) ? donePayload.metadata : {};
  const traceMeta = isRecord(metadata.trace_meta) ? metadata.trace_meta : {};
  const traceId = String(
    (metadata.message_id ?? metadata.trace_id ?? metadata.turn_id ?? metadata.messageId ?? traceMeta.trace_id ?? traceMeta.sdk_trace_id ?? traceMeta.local_trace_id) || '\u672a\u8fd4\u56de',
  );
  const traceUrl = String(metadata.trace_url ?? traceMeta.trace_url ?? '\u672a\u8fd4\u56de');
  return { traceId, traceUrl };
}

function isMatchExpected(actual: string, expected: string): boolean {
  if (!expected.trim()) return Boolean(actual.trim());
  const keywords = expected.split(/[,，;；|、\s]+/).map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) return Boolean(actual.trim());
  if (keywords.length === 1) return actual.includes(keywords[0]);
  const matched = keywords.filter(kw => actual.includes(kw));
  return matched.length / keywords.length >= 0.8;
}

function parseRows(inputPath: string, sheetName: string): ParsedCase[] {
  const wb = XLSX.readFile(inputPath);
  const sheet = wb.Sheets[sheetName];
  assert(sheet, `sheet not found: ${sheetName}`);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  assert(Array.isArray(grid) && grid.length >= 2, 'empty workbook');
  const header = grid[0].map((cell) => String(cell ?? '').trim());
  const idxCase = header.indexOf(COL_CASE_ID);
  const idxPrompt = header.indexOf(COL_PROMPT);
  const idxExpected = header.indexOf(COL_EXPECTED);
  const idxResult = header.indexOf(COL_RESULT);
  assert(idxCase >= 0, `column missing: ${COL_CASE_ID}`);
  assert(idxPrompt >= 0, `column missing: ${COL_PROMPT}`);
  assert(idxExpected >= 0, `column missing: ${COL_EXPECTED}`);
  assert(idxResult >= 0, `column missing: ${COL_RESULT}`);

  const cases: ParsedCase[] = [];
  for (let i = 1; i < grid.length; i += 1) {
    const row = grid[i] as unknown[];
    if (!Array.isArray(row) || row.every((v) => v === '' || v === null || v === undefined)) continue;
    const prompt = String(row[idxPrompt] ?? '');
    cases.push({
      rowIndex: i + 1,
      caseId: String(row[idxCase] ?? ''),
      prompt,
      expected: String(row[idxExpected] ?? ''),
    });
  }
  return cases;
}

async function waitForUserConfirmation(message: string): Promise<void> {
  const rl = readline.createInterface({ input, output });
  await rl.question(message);
  rl.close();
}

async function collectCookiesFromPlaywright(loginUrl: string): Promise<string> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  console.log(`\n[Playwright] Opened: ${loginUrl}`);
  console.log('\u8bf7\u5728\u6d4f\u89c8\u5668\u4e2d\u626b\u7801\u767b\u5f55\u5b8c\u6210\u540e\uff0c\u56de\u5230\u7ec8\u7aef\u6309\u56de\u8f66\u7ee7\u7eed');
  await waitForUserConfirmation('\u767b\u5f55\u5b8c\u6210\u540e\u6309\u56de\u8f66\u7ee7\u7eed...');

  const cookies = await context.cookies();
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  await context.close();
  await browser.close();
  return cookieHeader;
}

async function runHttpChat(
  endpoint: string,
  message: string,
  batchId: string,
  caseId: string,
  cookieHeader: string,
): Promise<{ answer: string; donePayload: Record<string, unknown> | undefined }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pathname': '/evaluation',
      'x-conversation-id': `eval-${batchId}-${caseId || Date.now()}`,
      'user-agent': 'lianu-playwright-eval',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({ message, history: [], intent: 'general_chat', metadata: { batchId, caseId } }),
  });
  if (!response.body) return { answer: '', donePayload: undefined };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  const payloads = parseSsePayloads(text);
  const donePayload = payloads.find((payload) => payload.type === 'done') as Record<string, unknown> | undefined;
  let answer = '';
  for (const payload of payloads) {
    if (payload.type === 'content' && typeof payload.content === 'string') {
      answer += payload.content;
    }
  }
  if (!answer) answer = getDonePayloadText(donePayload);
  return { answer, donePayload };
}

async function executeCase(item: ParsedCase, batchId: string, endpoint: string, cookieHeader: string): Promise<ExecutionResult> {
  const start = Date.now();
  try {
    const result = await runHttpChat(endpoint, item.prompt, batchId, item.caseId, cookieHeader);
    const durationMs = Date.now() - start;
    const content = (result.answer || '').trim();
    const status = isMatchExpected(content, item.expected) ? 'PASS' : 'FAIL';
    const trace = extractTrace(result.donePayload);
    return {
      status,
      content: status === 'PASS' ? `PASS | \u8017\u65f6 ${durationMs}ms` : `FAIL | \u9884\u671f\u7ed3\u679c\u4e0d\u5339\u914d: ${item.expected || '\u7a7a'}`,
      traceId: trace.traceId,
      traceUrl: trace.traceUrl,
      durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return {
      status: 'FAIL',
      content: `FAIL | \u6267\u884c\u5f02\u5e38: ${message}`,
      traceId: '\u672a\u8fd4\u56de',
      traceUrl: '\u672a\u8fd4\u56de',
      durationMs: Date.now() - start,
      error: message,
    };
  }
}

function writeResultWorkbook(
  inputPath: string,
  sheetName: string,
  rows: ParsedCase[],
  resultMap: Map<number, ExecutionResult>,
  outputPath: string,
): void {
  const wb = XLSX.readFile(inputPath);
  const sheet = wb.Sheets[sheetName];
  assert(sheet, `sheet not found: ${sheetName}`);
  const rowsAoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][];

  const header = (rowsAoa[0] || []).map((cell) => String(cell ?? '').trim());
  const resultIndex = header.indexOf(COL_RESULT);
  const traceHeader = 'traceId';
  let traceIndex = header.indexOf(traceHeader);
  if (traceIndex < 0) {
    traceIndex = header.length;
    header.push(traceHeader);
  }
  rowsAoa[0] = header;

  let pass = 0;
  let fail = 0;
  let totalDuration = 0;
  for (const item of rows) {
    const exec = resultMap.get(item.rowIndex) || {
      status: 'FAIL',
      content: 'FAIL | no result',
      traceId: '\u672a\u8fd4\u56de',
      traceUrl: '\u672a\u8fd4\u56de',
      durationMs: 0,
    };
    const newRow = rowsAoa[item.rowIndex] ? [...(rowsAoa[item.rowIndex] as unknown[])] : [];
    if (newRow.length < header.length) newRow.length = header.length;
    newRow[resultIndex] = exec.content;
    newRow[traceIndex] = exec.traceId;
    rowsAoa[item.rowIndex] = newRow;
    if (exec.status === 'PASS') pass += 1;
    else fail += 1;
    totalDuration += exec.durationMs;
  }

  const total = rows.length;
  const summaryRows = [
    ['\u6d4b\u8bd5\u6279\u6b21\u53f7', path.basename(inputPath)],
    ['\u6d4b\u8bd5\u6587\u4ef6', path.basename(inputPath)],
    ['\u6d4b\u8bd5\u65f6\u95f4', new Date().toISOString()],
    ['\u603b\u6570', String(total)],
    ['\u901a\u8fc7', String(pass)],
    ['\u5931\u8d25', String(fail)],
    ['\u901a\u8fc7\u7387', total ? `${((pass / total) * 100).toFixed(2)}%` : '0%'],
    ['\u5e73\u5747\u8017\u65f6(ms)', total ? `${Math.round(totalDuration / total)}` : '0'],
    ['\u8d28\u91cf', '\u53f7\u7801\u5df2\u5199\u5165\u6700\u53f3\u5217'],
  ];
  wb.Sheets['\u6267\u884c\u6c47\u603b'] = XLSX.utils.aoa_to_sheet(summaryRows);
  wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rowsAoa);
  XLSX.writeFile(wb, outputPath);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  assert(args.input, '--input is required');
  const absInput = path.resolve(args.input);
  const rows = parseRows(absInput, args.sheet);
  assert(rows.length > 0, 'no usable rows');

  const outputPath = buildOutputPath(absInput, args.batchId, args.outputDir || path.dirname(absInput));
  let cookieHeader = '';
  if (args.usePlaywright) {
    cookieHeader = await collectCookiesFromPlaywright(args.loginUrl);
  }

  const resultMap = new Map<number, ExecutionResult>();
  for (const item of rows) {
    const result = await executeCase(item, args.batchId, args.endpoint, cookieHeader);
    resultMap.set(item.rowIndex, result);
    writeResultWorkbook(absInput, args.sheet, rows, resultMap, outputPath);
    console.log(`updated: ${outputPath} | row ${item.rowIndex}/${rows.length}`);
  }
  console.log(`output: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
