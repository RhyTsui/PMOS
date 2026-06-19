import { readFileSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import path from 'node:path';

const BASE_URL = 'http://10.236.14.27:8002';
const AUTH_DIR = path.resolve('.auth');
const EXCEL_PATH = 'E:/AI/ai-os/docs/sources/inbox/小乔智投测试集v1.1.xlsx';
const OUTPUT_PATH = path.join(AUTH_DIR, 'round2-batch-results.json');
const LOGIN_STATE_PATH = path.join(AUTH_DIR, 'login-state.json');

const CHAT_TIMEOUT_MS = 120_000;
const DELAY_BETWEEN_CASES_MS = 3000;

interface TestCase {
  index: number;
  caseId: string;
  scenario: string;
  prompt: string;
}

interface CaseResult {
  index: number;
  caseId: string;
  scenario: string;
  prompt: string;
  httpStatus: number;
  contentLength: number;
  contentPreview: string;
  rcStatus: string;
  intentType: string;
  resultType: string;
  errorCount: number;
  errorMessages: string[];
  durationMs: number;
  passed: boolean;
}

function loadTestCases(): TestCase[] {
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return rows
    .map((row, i) => ({
      index: i,
      caseId: String(row['用例ID'] || `ROW-${i}`),
      scenario: String(row['测试场景'] || ''),
      prompt: String(row['测试输入Prompt'] || ''),
    }))
    .filter((tc) => tc.prompt.trim().length > 0);
}

function getCookies(): string {
  const loginState = JSON.parse(readFileSync(LOGIN_STATE_PATH, 'utf8'));
  return loginState.cookies
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');
}

async function runCase(tc: TestCase): Promise<CaseResult> {
  const startTime = Date.now();
  const convId = `batch-${tc.index}-${Date.now().toString(36)}`;

  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookies(),
        'x-conversation-id': convId,
      },
      body: JSON.stringify({
        message: tc.prompt,
        intent: 'general_chat',
        history: [],
        metadata: {},
      }),
    });

    const raw = await response.text();

    // Parse SSE events
    const events: any[] = [];
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        try {
          const parsed = JSON.parse(trimmed.slice(5).trim());
          if (parsed) events.push(parsed);
        } catch {}
      }
    }

    let content = '';
    events.forEach((e) => { if (e.type === 'content') content += e.content || ''; });
    const done = events.find((e) => e.type === 'done');
    const errors = events.filter((e) => e.type === 'error');
    const rc = done?.metadata?.response_contract || {};

    const durationMs = Date.now() - startTime;
    const passed = response.status === 200 && content.length > 0 && rc.status !== 'failed' && errors.length === 0;

    return {
      index: tc.index,
      caseId: tc.caseId,
      scenario: tc.scenario,
      prompt: tc.prompt.slice(0, 100),
      httpStatus: response.status,
      contentLength: content.length,
      contentPreview: content.slice(0, 200),
      rcStatus: rc.status || '',
      intentType: rc.intent_type || '',
      resultType: rc.result_type || '',
      errorCount: errors.length,
      errorMessages: errors.map((e) => e.message || e.error || '').slice(0, 3),
      durationMs,
      passed,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      index: tc.index,
      caseId: tc.caseId,
      scenario: tc.scenario,
      prompt: tc.prompt.slice(0, 100),
      httpStatus: 0,
      contentLength: 0,
      contentPreview: '',
      rcStatus: 'error',
      intentType: '',
      resultType: '',
      errorCount: 1,
      errorMessages: [error instanceof Error ? error.message : String(error)],
      durationMs,
      passed: false,
    };
  }
}

async function main() {
  const cases = loadTestCases();
  console.log(`Loaded ${cases.length} test cases`);
  console.log('Starting batch test (direct API calls)...');

  const results: CaseResult[] = [];
  const total = cases.length;

  for (let i = 0; i < total; i++) {
    const tc = cases[i];
    const caseStartTime = Date.now();

    const result = await runCase(tc);
    results.push(result);

    const elapsed = ((Date.now() - caseStartTime) / 1000).toFixed(1);
    const status = result.passed ? 'PASS' : 'FAIL';
    const id = result.caseId || `ROW-${result.index}`;
    console.log(
      `[${status}] [${String(i + 1).padStart(3)}/${total}] ${id.padEnd(30)} | ${result.scenario.padEnd(25)} | ${result.rcStatus.padEnd(15)} | ${String(result.contentLength).padStart(5)} chars | ${elapsed.padStart(6)}s`,
    );

    // Save intermediate results every 10 cases
    if ((i + 1) % 10 === 0 || i === total - 1) {
      writeFileSync(OUTPUT_PATH, JSON.stringify({
        timestamp: new Date().toISOString(),
        total: cases.length,
        completed: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        results,
      }, null, 2), 'utf8');
    }

    // Delay between cases
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CASES_MS));
    }
  }

  // Final summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n========== BATCH TEST SUMMARY ==========`);
  console.log(`Total: ${total}`);
  console.log(`Completed: ${results.length}`);
  console.log(`Passed: ${passed} (${results.length > 0 ? ((passed / results.length) * 100).toFixed(1) : 0}%)`);
  console.log(`Failed: ${failed} (${results.length > 0 ? ((failed / results.length) * 100).toFixed(1) : 0}%)`);

  console.log('\nFailed cases:');
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  [${r.index}] ${r.caseId} | ${r.scenario} | rc:${r.rcStatus} | errs: ${r.errorMessages.join('; ')}`);
  });

  console.log('\nResults saved to:', OUTPUT_PATH);
}

main().catch((err) => {
  console.error('Batch test error:', err);
  process.exit(1);
});
