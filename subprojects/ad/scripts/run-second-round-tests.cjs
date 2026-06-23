/**
 * 第二轮全量测试脚本 v3
 * - 带登录态自动测试
 * - 检测到登录失效时自动弹出浏览器让用户扫码
 * - 支持服务器崩溃重试
 */
const XLSX = require('xlsx');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const BASE_URL = process.env.SECOND_ROUND_BASE_URL || 'http://10.236.14.27:8002';
const TIMEOUT_MS = 90000;
const MAX_RETRIES = 2;
const SERVER_RESTART_WAIT = 15000;
const SERVER_DIR = 'E:/AI/ai-os/subprojects/ad/frontend/src';
const SERVER_MEMORY_GUARD_MB = Number(process.env.SECOND_ROUND_MAX_SERVER_RSS_MB || 3072);
const MEMORY_SAMPLE_LIMIT = Number(process.env.SECOND_ROUND_MEMORY_SAMPLE_LIMIT || 200);
const NON_INTERACTIVE = process.env.SECOND_ROUND_NON_INTERACTIVE === '1';
const ALLOW_SERVER_RESTART = process.env.SECOND_ROUND_ALLOW_SERVER_RESTART === '1';
const START_FROM_CASE_ID = String(process.env.SECOND_ROUND_START_FROM_CASE_ID || '').trim();
const START_FROM_EXCEL_ROW = Number(process.env.SECOND_ROUND_START_FROM_EXCEL_ROW || 0);
const CASE_LIMIT = Number(process.env.SECOND_ROUND_LIMIT || 0);

const INPUT_FILE = path.resolve(process.env.SECOND_ROUND_INPUT_FILE || 'E:/AI/ai-os/subprojects/ad/docs/review/testcase-prompts-v1.1-renumbered.md');
const OUTPUT_DIR = path.resolve('E:/AI/ai-os/subprojects/ad/docs/review');
const DEFAULT_AUTH_FILE = 'E:/AI/ai-os/subprojects/ad/tmp/auth-state.json';
const AUTH_FILE = path.resolve(process.env.SECOND_ROUND_AUTH_FILE || DEFAULT_AUTH_FILE);

// ── 加载认证状态 ──
let authCookies = [];

function loadAuth() {
  try {
    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const cookies = Array.isArray(authData.cookies)
      ? authData.cookies
      : Array.isArray(authData.authData?.cookies)
        ? authData.authData.cookies
        : [];
    authCookies = cookies.filter(cookie => cookie && typeof cookie.name === 'string' && typeof cookie.value === 'string');
    const cookieNames = authCookies.map(cookie => cookie.name).sort();
    const timestamp = authData.timestamp || authData.authData?.timestamp || 'unknown';
    console.log(`🔑 已加载登录态: cookies=${cookieNames.join(',') || 'none'} timestamp=${timestamp} file=${AUTH_FILE}`);
    return authCookies.length > 0;
  } catch (e) {
    console.warn(`⚠️  未找到登录态文件: ${AUTH_FILE}`);
    return false;
  }
}

function getCookieHeader() {
  return authCookies.map(c => `${c.name}=${c.value}`).join('; ');
}

function arrayFromContract(contract, snakeKey, camelKey) {
  const value = contract?.[snakeKey] || contract?.[camelKey] || [];
  return Array.isArray(value) ? value : [];
}

function compactProcessValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').slice(0, 180);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') {
    const picked = {};
    for (const key of ['summary', 'reason', 'message', 'status', 'toolName', 'tool_name', 'serverName', 'capabilityId', 'missingInputReason']) {
      if (value[key] != null) picked[key] = compactProcessValue(value[key]);
    }
    const keys = Object.keys(picked);
    return keys.length ? JSON.stringify(picked).slice(0, 220) : `object(${Object.keys(value).slice(0, 6).join(',')})`;
  }
  return String(value).slice(0, 180);
}

function summarizeProcessEvents(processEvents) {
  return processEvents.slice(-16).map((evt, index) => ({
    index: Math.max(0, processEvents.length - 16) + index,
    type: evt.type || '',
    label: evt.label || evt.name || '',
    status: evt.status || '',
    toolName: evt.tool_name || evt.toolName || '',
    summary: compactProcessValue(evt.summary || evt.message || evt.reason || evt.output),
    outputSummary: compactProcessValue(evt.output),
    sourceRefCount: Array.isArray(evt.source_refs) ? evt.source_refs.length : 0,
  }));
}

function summarizeContractEvidence(doneEvent, streamEvents) {
  const contract = doneEvent?.result?.response_contract || doneEvent?.metadata?.response_contract || {};
  const metadataProcessEvents = doneEvent?.metadata?.process_events;
  const processEvents = Array.isArray(metadataProcessEvents)
    ? metadataProcessEvents
    : streamEvents.filter(evt => evt.type === 'process_event').map(evt => evt.event || evt);
  const sourceRefs = arrayFromContract(contract, 'source_refs', 'sourceRefs');
  const evidenceRefs = arrayFromContract(contract, 'evidence_refs', 'evidenceRefs');
  const toolCallTrace = arrayFromContract(contract, 'tool_call_trace', 'toolCallTrace');
  return {
    hasResponseContract: Boolean(contract && Object.keys(contract).length),
    status: contract.status || '',
    sourceRefCount: sourceRefs.length,
    evidenceRefCount: evidenceRefs.length,
    toolCallTraceCount: toolCallTrace.length,
    processEventCount: processEvents.length,
    processEventSummary: summarizeProcessEvents(processEvents),
    hasGroundedExecution: sourceRefs.length > 0
      && evidenceRefs.length > 0
      && toolCallTrace.length > 0
      && processEvents.length > 0,
  };
}

// ── 弹出浏览器让用户扫码登录 ──
async function promptLogin() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 需要登录！正在弹出 Chrome 浏览器...');
  console.log('   请在浏览器中扫码登录，登录后自动继续测试');
  console.log('='.repeat(60) + '\n');

  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--new-window', '--window-size=1200,900'],
  });
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // 轮询等待登录成功（5 分钟）
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const cookies = await context.cookies();
    const token = cookies.find(c => c.name === 'xiaoqiao_auth_token');
    const session = cookies.find(c => c.name === 'xiaoqiao_auth_session');
    const url = page.url();
    const elapsed = Math.round((Date.now() - (deadline - 300000)) / 1000);

    if (token && session && !url.includes('/login')) {
      console.log('✅ 登录成功！');
      // 保存新的 cookie
      authCookies = cookies;
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
      fs.writeFileSync(AUTH_FILE, JSON.stringify({
        cookies,
        token: token.value,
        session: session.value,
        timestamp: new Date().toISOString(),
      }, null, 2));
      await new Promise(r => setTimeout(r, 2000));
      await browser.close();
      return true;
    }

    process.stdout.write(`\r⏳ 等待登录... ${elapsed}s`);
  }

  console.log('\n❌ 登录超时');
  await browser.close();
  return false;
}

// 检查回答是否表示需要登录
function isAuthRequired(answer, contractStatus) {
  if (contractStatus === 'blocked' && answer && answer.includes('登录')) return true;
  if (answer && /需要登录|请先登录|登录后才能/.test(answer)) return true;
  return false;
}

function decodeMarkdownCell(value) {
  return String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\\|/g, '|').trim();
}

function parseMarkdownPromptTable(file) {
  const text = fs.readFileSync(file, 'utf8');
  const parsedRows = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|\s*-+\s*\|\s*-+\s*\|$/.test(trimmed)) continue;
    const cells = trimmed.slice(1, -1).split(/(?<!\\)\|/).map(decodeMarkdownCell);
    if (cells.length < 2 || cells[0] === '编号') continue;
    const id = cells[0];
    const prompt = cells[1];
    if (!id || !prompt) continue;
    parsedRows.push([id, '', prompt, '', '', '', '']);
  }
  return parsedRows;
}

function loadTestSuite(file) {
  if (/\.md$/i.test(file)) {
    const mdRows = parseMarkdownPromptTable(file);
    const mdHeaders = ['用例ID', '测试场景', '测试输入Prompt', '关键点', '第一轮', '第二轮', '备注'];
    console.log(`📋 读取测试集: ${path.basename(file)}, ${mdRows.length} 条用例`);
    return { rows: [mdHeaders, ...mdRows], headers: mdHeaders, sourceType: 'markdown' };
  }
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const xlsxRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`📋 读取测试集: ${wb.SheetNames[0]}, ${xlsxRows.length - 1} 条用例`);
  return { rows: xlsxRows, headers: xlsxRows[0], sourceType: 'xlsx' };
}

// ── 读取测试集 ──
const testSuite = loadTestSuite(INPUT_FILE);
const rows = testSuite.rows;
const headers = testSuite.headers;
const sourceType = testSuite.sourceType;
const COL = {
  id: headers.indexOf('用例ID'),
  scene: headers.indexOf('测试场景'),
  prompt: headers.indexOf('测试输入Prompt'),
  keyPoint: headers.indexOf('关键点'),
  round1: headers.indexOf('第一轮'),
  round2: headers.indexOf('第二轮'),
  note: headers.indexOf('备注'),
};

function timestampForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function requestedCaseIdSet() {
  const raw = process.env.SECOND_ROUND_CASE_IDS || '';
  const ids = raw.split(',').map(item => item.trim()).filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

function rowsFromStartExcelRow(inputRows, excelRowNumber) {
  if (!excelRowNumber) return inputRows;
  if (!Number.isInteger(excelRowNumber) || excelRowNumber < 2) {
    throw new Error(`SECOND_ROUND_START_FROM_EXCEL_ROW must be an Excel data row >= 2, got: ${excelRowNumber}`);
  }
  const startIndex = excelRowNumber - 2;
  if (startIndex >= inputRows.length) {
    throw new Error(`SECOND_ROUND_START_FROM_EXCEL_ROW out of range: ${excelRowNumber}`);
  }
  return inputRows.slice(startIndex);
}

function rowsFromStartCaseId(inputRows, startCaseId) {
  if (!startCaseId) return inputRows;
  const startIndex = inputRows.findIndex(row => String(row?.[COL.id] || '').trim() === startCaseId);
  if (startIndex < 0) {
    throw new Error(`SECOND_ROUND_START_FROM_CASE_ID not found: ${startCaseId}`);
  }
  return inputRows.slice(startIndex);
}

function rowsFromConfiguredStart(inputRows) {
  if (START_FROM_EXCEL_ROW) return rowsFromStartExcelRow(inputRows, START_FROM_EXCEL_ROW);
  return rowsFromStartCaseId(inputRows, START_FROM_CASE_ID);
}

function parseListeningPidsFromNetstat(text, port) {
  const output = new Set();
  const portToken = `:${port}`;
  for (const line of String(text || '').split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    const localAddress = parts[1] || '';
    const state = parts[3] || '';
    const pid = parts[4] || '';
    const isPortMatch = localAddress.endsWith(portToken) || localAddress.includes(`${portToken} `);
    if (isPortMatch && state === 'LISTENING' && /^\d+$/.test(pid)) output.add(Number(pid));
  }
  return Array.from(output);
}

function parseTasklistMemoryMb(text) {
  const line = String(text || '').split(/\r?\n/).find(item => item.trim() && !/^INFO:/i.test(item.trim()));
  if (!line) return 0;
  const match = line.match(/"([^"]*)"\s*$/);
  const raw = match ? match[1] : line.split(',').pop() || '';
  const kb = Number(raw.replace(/[^\d]/g, ''));
  return kb > 0 ? Math.round(kb / 1024) : 0;
}

function serverPort() {
  const parsed = new URL(BASE_URL);
  if (parsed.port) return Number(parsed.port);
  return parsed.protocol === 'https:' ? 443 : 80;
}

function findServerPids() {
  try {
    return parseListeningPidsFromNetstat(execSync('netstat -ano', { encoding: 'utf8' }), serverPort());
  } catch {
    return [];
  }
}

function readProcessMemoryMb(pid) {
  try {
    return parseTasklistMemoryMb(execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' }));
  } catch {
    return 0;
  }
}

function serverMemorySnapshot() {
  const pids = findServerPids();
  const processes = pids.map(pid => ({ pid, workingSetMb: readProcessMemoryMb(pid) }));
  return {
    sampledAt: new Date().toISOString(),
    guardMb: SERVER_MEMORY_GUARD_MB,
    pids,
    processes,
    maxWorkingSetMb: Math.max(0, ...processes.map(item => item.workingSetMb || 0)),
  };
}

function rememberMemorySample(samples, sample, limit = MEMORY_SAMPLE_LIMIT) {
  samples.push(sample);
  if (Number.isFinite(limit) && limit > 0 && samples.length > limit) {
    samples.splice(0, samples.length - limit);
  }
  return sample;
}

function memoryGuardFailure() {
  if (!Number.isFinite(SERVER_MEMORY_GUARD_MB) || SERVER_MEMORY_GUARD_MB <= 0) return null;
  const snapshot = serverMemorySnapshot();
  if (snapshot.maxWorkingSetMb <= SERVER_MEMORY_GUARD_MB) return null;
  return {
    verdict: '阻断',
    reason: `dev server 内存 ${snapshot.maxWorkingSetMb}MB 超过护栏 ${SERVER_MEMORY_GUARD_MB}MB`,
    memoryGuard: snapshot,
  };
}

// ── 服务器健康检查 ──
function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, { timeout: 15000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function checkAuth() {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/api/xiaoqiao/auth/me`);
    const cookieHeader = getCookieHeader();
    const req = http.get({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      timeout: 15000,
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  const ok = await checkServer();
  if (ok) return true;
  if (!ALLOW_SERVER_RESTART) {
    console.log('  ⚠️  服务器无响应，未开启自动重启（SECOND_ROUND_ALLOW_SERVER_RESTART=1）');
    return false;
  }
  const port = serverPort();
  console.log(`  ⚠️  服务器无响应，尝试按端口 ${port} 重启...`);
  try { execSync('taskkill /F /IM tsx.exe 2>nul', { stdio: 'ignore' }); } catch {}
  await new Promise(r => setTimeout(r, 3000));
  execSync(`cd /d "${SERVER_DIR}" && start /B cmd /c "set PORT=${port}&& set HOST=0.0.0.0&& npm.cmd run dev 2>&1"`, { stdio: 'ignore', windowsVerbatimArguments: true });
  console.log(`  等待 ${SERVER_RESTART_WAIT / 1000}s ...`);
  await new Promise(r => setTimeout(r, SERVER_RESTART_WAIT));
  return await checkServer();
}

function readDoneAnswer(doneEvent) {
  const result = doneEvent?.result && typeof doneEvent.result === 'object' ? doneEvent.result : {};
  const metadata = doneEvent?.metadata && typeof doneEvent.metadata === 'object' ? doneEvent.metadata : {};
  const contract = result.response_contract && typeof result.response_contract === 'object'
    ? result.response_contract
    : metadata.response_contract && typeof metadata.response_contract === 'object'
      ? metadata.response_contract
      : {};
  const candidates = [
    result.answer,
    result.content,
    result.message,
    result.summary,
    result.answer_markdown,
    doneEvent?.content,
    doneEvent?.answer,
    contract.answer,
    contract.content,
    contract.message,
    contract.summary,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function readContractField(doneEvent, snakeKey, camelKey) {
  const result = doneEvent?.result && typeof doneEvent.result === 'object' ? doneEvent.result : {};
  const metadata = doneEvent?.metadata && typeof doneEvent.metadata === 'object' ? doneEvent.metadata : {};
  const contract = result.response_contract && typeof result.response_contract === 'object'
    ? result.response_contract
    : metadata.response_contract && typeof metadata.response_contract === 'object'
      ? metadata.response_contract
      : {};
  return contract[snakeKey] || contract[camelKey] || '';
}
// ── SSE 请求 ──
function sendChat(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message: prompt });
    const url = new URL(`${BASE_URL}/api/chat`);
    const cookieHeader = getCookieHeader();
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let buffer = '';
      let answer = '';
      let intentType = '';
      let resultType = '';
      let contractStatus = '';
      const streamEvents = [];
      let doneEvent = null;

      res.setEncoding('utf-8');
      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            streamEvents.push(evt);
            if (evt.type === 'content' && typeof evt.content === 'string') {
              answer += evt.content;
            }
            if (evt.type === 'done') {
              doneEvent = evt;
              if (!answer.trim()) answer = readDoneAnswer(doneEvent);
              intentType = readContractField(doneEvent, 'intent_type', 'intentType');
              resultType = readContractField(doneEvent, 'result_type', 'resultType');
              contractStatus = readContractField(doneEvent, 'status', 'status');
            }
          } catch {}
        }
      });

      res.on('end', () => {
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
              const evt = JSON.parse(line.slice(5).trim());
              streamEvents.push(evt);
              if (evt.type === 'content' && typeof evt.content === 'string') {
                answer += evt.content;
              }
              if (evt.type === 'done') {
                doneEvent = evt;
                if (!answer.trim()) answer = readDoneAnswer(doneEvent);
                intentType = readContractField(doneEvent, 'intent_type', 'intentType');
                resultType = readContractField(doneEvent, 'result_type', 'resultType');
                contractStatus = readContractField(doneEvent, 'status', 'status');
              }
            } catch {}
          }
        }
        if (!answer.trim()) answer = readDoneAnswer(doneEvent);
        resolve({
          answer,
          intentType,
          resultType,
          contractStatus,
          contractEvidence: summarizeContractEvidence(doneEvent, streamEvents),
          ok: res.statusCode >= 200 && res.statusCode < 300,
          httpStatus: res.statusCode,
        });
      });
      res.on('error', reject);
    });

    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timeout (${TIMEOUT_MS / 1000}s)`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 评估 ──
function pad2(value) {
  return String(value).padStart(2, '0');
}

function normalizeExpectationText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[,\s，、。:：；;（）()【】\[\]元]/g, '');
}

function explicitDateTokens(prompt) {
  const text = String(prompt || '');
  const output = [];
  for (const match of text.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    output.push(`${match[1]}-${pad2(match[2])}-${pad2(match[3])}`);
  }
  for (const match of text.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})(?:号|日)?/g)) {
    output.push(`${match[1]}-${pad2(match[2])}-${pad2(match[3])}`);
  }
  for (const match of text.matchAll(/\b(20\d{2})([01]\d)([0-3]\d)\b/g)) {
    output.push(`${match[1]}-${match[2]}-${match[3]}`);
  }
  return Array.from(new Set(output));
}

function answerContainsDate(answer, dateToken) {
  const [year, month, day] = dateToken.split('-');
  const normalized = normalizeExpectationText(answer);
  return normalized.includes(dateToken)
    || normalized.includes(`${year}年${Number(month)}月${Number(day)}日`)
    || normalized.includes(`${year}年${Number(month)}月${Number(day)}号`);
}

function expectedResultSection(keyPoint) {
  const text = String(keyPoint || '');
  const match = text.match(/返回结果[:：]([\s\S]*?)(?:\r?\n\s*4[、.]|$)/);
  return match ? match[1].trim() : '';
}

function addExpectedResultItem(items, seen, label, value, group = '') {
  const cleanLabel = String(label || '')
    .split(/[:：]/)
    .pop()
    .replace(/^[\s:：，,、]+|[\s:：，,、]+$/g, '');
  const cleanGroup = String(group || '').replace(/^[\s:：，,、]+|[\s:：，,、]+$/g, '');
  const cleanValue = String(value || '').trim();
  if (!cleanLabel || !cleanValue) return;
  if (!/[\u4e00-\u9fa5a-z]/i.test(cleanLabel)) return;
  const key = `${normalizeExpectationText(cleanGroup)}:${normalizeExpectationText(cleanLabel)}:${normalizeExpectationText(cleanValue)}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push({ group: cleanGroup, label: cleanLabel, value: cleanValue });
}

function attachGroupBoundaries(items) {
  const groups = [];
  for (const item of items) {
    if (item.group && !groups.includes(item.group)) groups.push(item.group);
  }
  for (const item of items) {
    const index = item.group ? groups.indexOf(item.group) : -1;
    if (index >= 0 && groups[index + 1]) item.nextGroup = groups[index + 1];
  }
  return items;
}

function extractExpectedResultItems(keyPoint) {
  const section = expectedResultSection(keyPoint);
  if (!section || /人工复核|不存在日期|未来日期|不返回数据/.test(section)) return [];
  const items = [];
  const seen = new Set();
  const pattern = /([^:：\r\n，,、]+?)[:：]\s*([0-9][0-9,]*(?:\.\d+)?%?)/g;
  for (const match of section.matchAll(pattern)) {
    addExpectedResultItem(items, seen, match[1], match[2]);
  }
  const valuePattern = /[0-9][0-9,]*(?:\.\d+)?%?/g;
  for (const line of section.split(/\r?\n/)) {
    const groupMatch = line.trim().match(/^([^:：\r\n，,、]{1,20})[:：]\s*(.*)$/);
    const hasGroupPrefix = Boolean(groupMatch && !/^[0-9]/.test(groupMatch[2] || '') && /[\u4e00-\u9fa5a-z]/i.test(groupMatch[1]));
    const group = hasGroupPrefix ? groupMatch[1] : '';
    const scanText = hasGroupPrefix ? groupMatch[2] : line;
    let cursor = 0;
    for (const match of scanText.matchAll(valuePattern)) {
      const labelSegment = scanText.slice(cursor, match.index);
      const label = labelSegment.split(/[，,、]/).pop() || '';
      addExpectedResultItem(items, seen, label, match[0], group);
      cursor = match.index + match[0].length;
    }
  }
  return attachGroupBoundaries(items);
}

function expectedItemCovered(answer, item) {
  const normalizedAnswer = normalizeExpectationText(answer);
  const normalizedLabel = normalizeExpectationText(item.label);
  const normalizedValue = normalizeExpectationText(item.value);
  const relaxedLabel = normalizedLabel.replace(/(数量|数值|数|率)$/g, '');
  const normalizedGroup = normalizeExpectationText(item.group);
  const normalizedNextGroup = normalizeExpectationText(item.nextGroup);
  const groupStart = normalizedGroup ? normalizedAnswer.indexOf(normalizedGroup) : -1;
  const groupEnd = groupStart >= 0 && normalizedNextGroup
    ? normalizedAnswer.indexOf(normalizedNextGroup, groupStart + normalizedGroup.length)
    : -1;
  const scopedAnswer = groupStart >= 0
    ? normalizedAnswer.slice(groupStart, groupEnd > groupStart ? groupEnd : undefined)
    : normalizedAnswer;
  const hasLabel = normalizedLabel
    && (scopedAnswer.includes(normalizedLabel) || (relaxedLabel.length >= 2 && scopedAnswer.includes(relaxedLabel)));
  const hasValue = normalizedValue && scopedAnswer.includes(normalizedValue);
  return Boolean((!normalizedGroup || groupStart >= 0) && hasLabel && hasValue);
}

function evaluateReportExpectedCoverage(prompt, keyPoint, answer) {
  const dates = explicitDateTokens(prompt);
  const missingDates = dates.filter(date => !answerContainsDate(answer, date));
  if (missingDates.length > 0) {
    return `缺少查询日期 ${missingDates.join('、')}`;
  }
  const noDataFailure = evaluateNoDataExpectation(prompt, keyPoint, answer);
  if (noDataFailure) return noDataFailure;
  const expectedItems = extractExpectedResultItems(keyPoint);
  if (expectedItems.length >= 2) {
    const matched = expectedItems.filter(item => expectedItemCovered(answer, item));
    const required = Math.max(2, Math.ceil(expectedItems.length * 0.75));
    if (matched.length < required) {
      const missing = expectedItems
        .filter(item => !expectedItemCovered(answer, item))
        .slice(0, 4)
        .map(item => `${item.label}:${item.value}`)
        .join('；');
      return `关键结果覆盖不足 ${matched.length}/${expectedItems.length}，缺少 ${missing}`;
    }
  }
  return '';
}

function hasNoDataExpectation(prompt, keyPoint) {
  const section = expectedResultSection(keyPoint);
  const expectation = `${section} ${keyPoint || ''} ${prompt || ''}`;
  return /不存在日期|无效日期|未来日期|不返回数据|无数据|暂无数据|没数据/.test(expectation);
}

function evaluateNoDataExpectation(prompt, keyPoint, answer) {
  const section = expectedResultSection(keyPoint);
  const expectation = `${section} ${keyPoint || ''}`;
  const normalizedAnswer = normalizeExpectationText(answer);
  const expectsInvalidDate = /不存在日期|无效日期/.test(expectation);
  const expectsFutureDate = /未来日期/.test(expectation) || /未来日期/.test(prompt);
  const expectsNoData = expectsInvalidDate || expectsFutureDate || /不返回数据|无数据|暂无数据|没数据/.test(expectation);
  if (!expectsNoData) return '';
  const hasNoDataSignal = /不返回数据|无数据|暂无数据|没数据|没有数据|查不到|不存在|无效日期|日期无效|未来日期|尚未发生|不能查询|无法查询/.test(answer);
  if (!hasNoDataSignal) return '缺少不返回数据/无数据说明';
  const metricValuePattern = /(激活数|注册数|有效数|首日付费数|消耗|折后消耗|roi|ROI|留存率|留存数)[^\d%]{0,8}[0-9][0-9,]*(?:\.\d+)?%?/;
  if (metricValuePattern.test(answer) && !/示例|例如/.test(answer)) {
    return '不返回数据场景不应输出报表指标数值';
  }
  if (expectsInvalidDate && !/不存在|无效日期|日期无效|2月30|02-30|不返回数据|无数据|暂无数据|没数据|没有数据|查不到/.test(answer)) {
    return '缺少无效日期说明';
  }
  if (expectsFutureDate && !/未来日期|尚未发生|不返回数据|无数据|暂无数据|没数据|没有数据|不能查询|无法查询/.test(answer)) {
    return '缺少未来日期说明';
  }
  return normalizedAnswer ? '' : '空回答';
}

function evaluate(caseId, scene, prompt, keyPoint, note, answer, intentType, resultType, contractStatus, contractEvidence = {}) {
  if (!answer || answer.trim() === '') {
    return { pass: false, verdict: '失败', reason: '空回答' };
  }

  // 登录阻断
  if (isAuthRequired(answer, contractStatus)) {
    return { pass: false, verdict: '阻断', reason: '需要登录' };
  }

  // 系统错误
  if (answer.includes('系统错误') || answer.includes('服务异常')) {
    return { pass: false, verdict: '失败', reason: '系统错误' };
  }

  // MIG-000 连通
  if (caseId === 'MIG-000') {
    return { pass: answer.length > 5, verdict: answer.length > 5 ? '通过' : '失败', reason: `回答长度 ${answer.length}` };
  }

  // MIG-001 天气
  if (caseId === 'MIG-001' && scene === '天气') {
    const hasWeather = /天气|气温|温度|度|℃|南京|降水|多云|晴|雨/.test(answer);
    const denied = /无法联网|不能搜索|没有联网|无法搜索|无法访问互联网/.test(answer);
    if (denied) return { pass: false, verdict: '失败', reason: '声称无法联网' };
    return { pass: hasWeather, verdict: hasWeather ? '通过' : '失败', reason: hasWeather ? '含天气信息' : '缺少天气信息' };
  }

  // 联网搜索类
  if (keyPoint && keyPoint.includes('联网搜索')) {
    const denied = /无法联网|不能搜索|没有联网|无法搜索|无法访问互联网/.test(answer);
    if (denied) return { pass: false, verdict: '失败', reason: '声称无法联网' };
    const hasEvidence = /来源|参考|根据|搜索|最新/.test(answer) || answer.length > 80;
    return { pass: hasEvidence, verdict: hasEvidence ? '通过' : '失败', reason: hasEvidence ? '有信息支撑' : '回答过短或无依据' };
  }

  // 知识库类
  if (keyPoint && keyPoint.includes('知识库') && !keyPoint.includes('联网')) {
    const denied = /无法.*知识|没有.*知识库/.test(answer);
    if (denied) return { pass: false, verdict: '失败', reason: '声称无知识库' };
    return { pass: answer.length > 20, verdict: answer.length > 20 ? '通过' : '失败', reason: `知识库回答长度 ${answer.length}` };
  }

  // 广告报表查询类
  const isReportCase = Boolean(
    (caseId && /(DATE|MEDIA|SEM|CSEM|ACC|MDIM|EDGE|BUS|DIA|FBK)-/.test(caseId))
    || /广告报表|报表查询|广告业务/.test(String(scene || ''))
    || /广告报表|报表 MCP|调用广告报表/.test(String(keyPoint || ''))
  );
  if (isReportCase || intentType === 'report_query' || intentType === 'multi_query') {
    // 追问/确认类也算通过
    const isClarify = /请.*提供|需要.*确认|请问.*哪|请告诉我|还需要/.test(answer) && answer.length < 300;
    const hasDataContent = /数据|报表|查询|消耗|展现|点击|结果|激活|注册|金额|占比|趋势|总计|项目/.test(answer);
    const hasContract = contractEvidence.hasResponseContract && ['success', 'degraded'].includes(contractEvidence.status || contractStatus);
    const hasExecutionEvidence = contractEvidence.hasGroundedExecution === true;

    if (isClarify) return { pass: true, verdict: '通过', reason: '合理追问' };
    if (!hasContract) return { pass: false, verdict: '失败', reason: '缺少有效 response_contract' };
    if (!hasExecutionEvidence) {
      return {
        pass: false,
        verdict: '失败',
        reason: `缺少执行证据 source=${contractEvidence.sourceRefCount || 0}, evidence=${contractEvidence.evidenceRefCount || 0}, tool=${contractEvidence.toolCallTraceCount || 0}, process=${contractEvidence.processEventCount || 0}`,
      };
    }
    const expectedCoverageFailure = evaluateReportExpectedCoverage(prompt, keyPoint, answer);
    if (expectedCoverageFailure) {
      return { pass: false, verdict: '失败', reason: expectedCoverageFailure };
    }
    if (hasNoDataExpectation(prompt, keyPoint)) {
      return { pass: true, verdict: '通过', reason: '符合不返回数据预期且契约证据完整' };
    }
    if (hasDataContent && answer.length > 30) return { pass: true, verdict: '通过', reason: '包含数据内容且契约证据完整' };
    if (answer.length > 50) return { pass: true, verdict: '通过', reason: '有实质回复且契约证据完整' };
    return { pass: false, verdict: '失败', reason: `回复不足: "${answer.slice(0, 60)}"` };
  }

  // 查数据类（MIG-009~014）
  if (caseId && /MIG-0(09|1[0-4])/.test(caseId)) {
    const hasData = /数据|查询|报表|消耗|项目|请.*提供|需要.*确认/.test(answer);
    return { pass: hasData || answer.length > 20, verdict: (hasData || answer.length > 20) ? '通过' : '失败', reason: hasData ? '有数据回复' : `回复长度 ${answer.length}` };
  }

  // 通用
  return { pass: answer.length > 10, verdict: answer.length > 10 ? '通过' : '失败', reason: `回答长度 ${answer.length}` };
}

function runEvaluationSelfTest() {
  const evidence = {
    hasResponseContract: true,
    status: 'success',
    sourceRefCount: 3,
    evidenceRefCount: 3,
    toolCallTraceCount: 6,
    processEventCount: 12,
    hasGroundedExecution: true,
  };
  const prompt = '指间2026-02-01 IOS应用类型+自然量+广告投放部 全天激活数、3日设备留存数、3日注册留存数、4日首日付费留存数分别是多少';
  const keyPoint = '1、识别为广告报表查询，并调用广告报表 MCP。\n2、正确解析项目、日期、媒体、应用类型、团队、指标等关键入参；缺少必要条件时先追问。\n3、返回结果：激活数：459 3日设备留存率：39.87% 3日注册留存率：41.12% 4日首日付费留存数：69.39%\n4、输出查询口径、筛选条件和数据来源，便于复核。';
  const wrong = evaluate('MIG-051', '广告报表-多维度交叉-MDIM-F002', prompt, keyPoint, '', '2026-02-01，激活数为 293，注册成本为 70.04 元。', 'report_query', '', 'success', evidence);
  if (wrong.pass) throw new Error('expected MIG-051 wrong daily fallback answer to fail');
  const right = evaluate('MIG-051', '广告报表-多维度交叉-MDIM-F002', prompt, keyPoint, '', '2026-02-01，激活数：459，3日设备留存率：39.87%，3日注册留存率：41.12%，4日首日付费留存数：69.39%。', 'report_query', '', 'success', evidence);
  if (!right.pass) throw new Error(`expected MIG-051 expected metrics answer to pass, got ${right.reason}`);
  const plainKeyPoint = '1、识别为广告报表查询，并调用广告报表 MCP。\n2、正确解析项目、日期、媒体、应用类型、团队、指标等关键入参；缺少必要条件时先追问。\n3、返回结果：激活数 645 首日 ROI 11.12%\n4、输出查询口径、筛选条件和数据来源，便于复核。';
  const plainWrong = evaluate('MIG-099', '广告报表-无冒号格式', '指间2026-05-01 激活数和首日 ROI', plainKeyPoint, '', '2026-05-01，激活数为 645，但首日 ROI 为 8.00%。', 'report_query', '', 'success', evidence);
  if (plainWrong.pass) throw new Error('expected plain metric/value answer with wrong ROI to fail');
  const plainRight = evaluate('MIG-099', '广告报表-无冒号格式', '指间2026-05-01 激活数和首日 ROI', plainKeyPoint, '', '2026-05-01，激活数 645，首日 ROI 11.12%。', 'report_query', '', 'success', evidence);
  if (!plainRight.pass) throw new Error(`expected plain metric/value answer to pass, got ${plainRight.reason}`);
  const groupedPrompt = '查询指间20260101 日报、所在周、所在月的激活数、注册数';
  const groupedKeyPoint = '1、识别为广告报表查询，并调用广告报表 MCP。\n2、正确解析项目、日期、媒体、应用类型、团队、指标等关键入参；缺少必要条件时先追问。\n3、返回结果：\n所在周： 激活数8,822 、注册数 7,859\n所在月：激活数 29,674、注册数 26,670\n4、输出查询口径、筛选条件和数据来源，便于复核。';
  const groupedWrong = evaluate('MIG-056', '广告报表-分组格式', groupedPrompt, groupedKeyPoint, '', '2026-01-01，所在周：激活数 29674，注册数 26670。所在月：激活数 8822，注册数 7859。', 'report_query', '', 'success', evidence);
  if (groupedWrong.pass) throw new Error('expected grouped week/month swapped answer to fail');
  const groupedRight = evaluate('MIG-056', '广告报表-分组格式', groupedPrompt, groupedKeyPoint, '', '2026-01-01，所在周：激活数 8,822，注册数 7,859。所在月：激活数 29,674，注册数 26,670。', 'report_query', '', 'success', evidence);
  if (!groupedRight.pass) throw new Error(`expected grouped week/month answer to pass, got ${groupedRight.reason}`);
  const mediaGroupedKeyPoint = '1、识别为广告报表查询，并调用广告报表 MCP。\n2、正确解析项目、日期、媒体、应用类型、团队、指标等关键入参；缺少必要条件时先追问。\n3、返回结果：\n巨量：激活数 1,234、首日 ROI 12.34%\n腾讯广告：激活数 567、首日 ROI 8.90%\n4、输出查询口径、筛选条件和数据来源，便于复核。';
  const mediaGroupedWrong = evaluate('MIG-066', '广告报表-媒体分组格式', '查询指间2026-03-25按媒体拆分激活数和首日 ROI', mediaGroupedKeyPoint, '', '2026-03-25，巨量：激活数 567，首日 ROI 8.90%。腾讯广告：激活数 1,234，首日 ROI 12.34%。', 'report_query', '', 'success', evidence);
  if (mediaGroupedWrong.pass) throw new Error('expected media grouped swapped answer to fail');
  const mediaGroupedRight = evaluate('MIG-066', '广告报表-媒体分组格式', '查询指间2026-03-25按媒体拆分激活数和首日 ROI', mediaGroupedKeyPoint, '', '2026-03-25，巨量：激活数 1,234，首日 ROI 12.34%。腾讯广告：激活数 567，首日 ROI 8.90%。', 'report_query', '', 'success', evidence);
  if (!mediaGroupedRight.pass) throw new Error(`expected media grouped answer to pass, got ${mediaGroupedRight.reason}`);
  const appTypeGroupedKeyPoint = '1、识别为广告报表查询，并调用广告报表 MCP。\n2、正确解析项目、日期、媒体、应用类型、团队、指标等关键入参；缺少必要条件时先追问。\n3、返回结果：\nIOS：激活数 2,345、注册数 1,987\n安卓：激活数 3,210、注册数 2,876\n4、输出查询口径、筛选条件和数据来源，便于复核。';
  const appTypeGroupedWrong = evaluate('MIG-053', '广告报表-应用类型分组格式', '查询指间2026-01-01应用类型维度的激活数和注册数', appTypeGroupedKeyPoint, '', '2026-01-01，IOS：激活数 3,210，注册数 2,876。安卓：激活数 2,345，注册数 1,987。', 'report_query', '', 'success', evidence);
  if (appTypeGroupedWrong.pass) throw new Error('expected app type grouped swapped answer to fail');
  const appTypeGroupedRight = evaluate('MIG-053', '广告报表-应用类型分组格式', '查询指间2026-01-01应用类型维度的激活数和注册数', appTypeGroupedKeyPoint, '', '2026-01-01，IOS：激活数 2,345，注册数 1,987。安卓：激活数 3,210，注册数 2,876。', 'report_query', '', 'success', evidence);
  if (!appTypeGroupedRight.pass) throw new Error(`expected app type grouped answer to pass, got ${appTypeGroupedRight.reason}`);
  const compactDateWrong = evaluate('MIG-057', '广告报表-紧凑日期', '查询指间20260101 小时报表 广告量激活数', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：广告量激活数1,183', '', '小时报表广告量激活数 1,183。', 'report_query', '', 'success', evidence);
  if (compactDateWrong.pass) throw new Error('expected compact YYYYMMDD answer without normalized date to fail');
  const compactDateRight = evaluate('MIG-057', '广告报表-紧凑日期', '查询指间20260101 小时报表 广告量激活数', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：广告量激活数1,183', '', '2026-01-01 小时报表查询结果：广告量激活数 1,183。筛选条件和数据来源已随报表结果返回。', 'report_query', '', 'success', evidence);
  if (!compactDateRight.pass) throw new Error(`expected compact YYYYMMDD answer with normalized date to pass, got ${compactDateRight.reason}`);
  const invalidDateWrong = evaluate('MIG-059', '广告报表-边缘场景-EDGE-001', '指间山海 2026 年 2 月 30 日的数据', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：不存在日期不返回数据', '', '2026-02-30，激活数 10，注册数 2。', 'report_query', '', 'success', evidence);
  if (invalidDateWrong.pass) throw new Error('expected invalid date answer with metric values to fail');
  const invalidDateRight = evaluate('MIG-059', '广告报表-边缘场景-EDGE-001', '指间山海 2026 年 2 月 30 日的数据', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：不存在日期不返回数据', '', '2026-02-30 是不存在的日期，本次不返回报表数据。', 'report_query', '', 'success', evidence);
  if (!invalidDateRight.pass) throw new Error(`expected invalid date no-data answer to pass, got ${invalidDateRight.reason}`);
  const futureDateWrong = evaluate('MIG-060', '广告报表-边缘场景-EDGE-003', '指间山海未来日期（2027 年 1 月 1 日）的数据', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：未来日期不返回数据', '', '2027-01-01，消耗 100，激活数 5。', 'report_query', '', 'success', evidence);
  if (futureDateWrong.pass) throw new Error('expected future date answer with metric values to fail');
  const futureDateRight = evaluate('MIG-060', '广告报表-边缘场景-EDGE-003', '指间山海未来日期（2027 年 1 月 1 日）的数据', '1、识别为广告报表查询，并调用广告报表 MCP。\n3、返回结果：未来日期不返回数据', '', '2027-01-01 是未来日期，尚未发生，暂不返回数据。', 'report_query', '', 'success', evidence);
  if (!futureDateRight.pass) throw new Error(`expected future date no-data answer to pass, got ${futureDateRight.reason}`);
  console.log('second round evaluation self-test passed');
}

function runMemoryGuardSelfTest() {
  const netstatSample = [
    '  TCP    0.0.0.0:8002           0.0.0.0:0              LISTENING       31248',
    '  TCP    127.0.0.1:52075        127.0.0.1:8002         ESTABLISHED     40672',
    '  TCP    [::1]:3000             [::]:0                 LISTENING       35092',
  ].join('\n');
  const pids = parseListeningPidsFromNetstat(netstatSample, 8002);
  if (pids.length !== 1 || pids[0] !== 31248) {
    throw new Error(`expected only 8002 listening pid 31248, got ${pids.join(',')}`);
  }
  const memoryMb = parseTasklistMemoryMb('"node.exe","31248","Console","1","1,557,155 K"');
  if (memoryMb !== 1521) {
    throw new Error(`expected tasklist memory 1521MB, got ${memoryMb}`);
  }
  const samples = [];
  rememberMemorySample(samples, { phase: 'a', maxWorkingSetMb: 100 }, 2);
  rememberMemorySample(samples, { phase: 'b', maxWorkingSetMb: 200 }, 2);
  rememberMemorySample(samples, { phase: 'c', maxWorkingSetMb: 150 }, 2);
  if (samples.length !== 2 || samples[0].phase !== 'b' || samples[1].phase !== 'c') {
    throw new Error(`expected bounded memory samples to keep last 2 entries, got ${JSON.stringify(samples)}`);
  }
  console.log('second round memory guard self-test passed');
}

// ── 主流程 ──
async function runAll() {
  const selectedCaseIds = requestedCaseIdSet();
  const runnableRows = rows
    .slice(1)
    .filter(row => row && row[COL.id]);
  const filteredRows = rowsFromConfiguredStart(runnableRows)
    .filter(row => row && row[COL.id])
    .filter(row => !selectedCaseIds || selectedCaseIds.has(String(row[COL.id]).trim()));
  const scopedRows = CASE_LIMIT > 0 ? filteredRows.slice(0, CASE_LIMIT) : filteredRows;
  const total = scopedRows.length;
  let passCount = 0, failCount = 0, blockedCount = 0, errorCount = 0;
  const allResults = [];
  const memorySamples = [];
  let memoryPeakMb = 0;
  const ts = timestampForFilename();
  const checkpointFile = path.join(OUTPUT_DIR, `小乔智投测试集v1.1_second-round-${ts}.checkpoint.json`);

  function captureMemory(phase, caseId = '', attempt = 0) {
    const snapshot = serverMemorySnapshot();
    const sample = rememberMemorySample(memorySamples, { phase, caseId, attempt, ...snapshot });
    memoryPeakMb = Math.max(memoryPeakMb, sample.maxWorkingSetMb || 0);
    return snapshot;
  }

  function maxObservedMemory() {
    return memoryPeakMb;
  }

  function writeCheckpoint() {
    const currentMemory = captureMemory('checkpoint');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(checkpointFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      selectedCaseIds: selectedCaseIds ? Array.from(selectedCaseIds) : null,
      startFromCaseId: START_FROM_CASE_ID || null,
      startFromExcelRow: START_FROM_EXCEL_ROW || null,
      caseLimit: CASE_LIMIT || null,
      total,
      passCount,
      failCount,
      blockedCount,
      errorCount,
      memoryGuard: currentMemory,
      memoryPeakMb: maxObservedMemory(),
      memorySamples,
      results: allResults,
    }, null, 2));
  }

  function blockAll(reason) {
    for (const row of scopedRows) {
      const caseId = String(row[COL.id]).trim();
      const scene = row[COL.scene] || '';
      const prompt = row[COL.prompt] || '';
      const keyPoint = row[COL.keyPoint] || '';
      const note = row[COL.note] || '';
      blockedCount++;
      row[COL.round2] = '阻断';
      allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: '阻断', reason, answer: '', elapsed: '', memoryGuard: captureMemory('block_all', caseId) });
    }
    writeCheckpoint();
  }

  // 先加载认证
  if (!loadAuth()) {
    if (NON_INTERACTIVE) {
      blockAll('登录态缺失，非交互模式不弹出浏览器');
      console.error('❌ 登录态缺失，已写入阻断 checkpoint');
      return;
    }
    const loginOk = await promptLogin();
    if (!loginOk) {
      console.error('❌ 无法登录，终止测试');
      process.exit(1);
    }
  }

  // 确认服务器可用
  const serverOk = await ensureServer();
  if (!serverOk) {
    blockAll(`服务器不可用：${BASE_URL}`);
    console.error('❌ 服务器无法启动');
    return;
  }
  console.log('✅ 服务器就绪\n');

  if (!await checkAuth()) {
    console.log('🔐 登录态已失效，先刷新登录...');
    if (NON_INTERACTIVE) {
      blockAll('登录态失效，非交互模式不弹出浏览器');
      console.error('❌ 登录态失效，已写入阻断 checkpoint');
      return;
    }
    const loginOk = await promptLogin();
    if (!loginOk || !await checkAuth()) {
      console.error('❌ 登录态刷新失败，终止测试');
      process.exit(1);
    }
  }

  let authRetryCount = 0;

  for (let index = 0; index < scopedRows.length; index++) {
    const row = scopedRows[index];

    const caseId = String(row[COL.id]).trim();
    const scene = row[COL.scene] || '';
    const prompt = row[COL.prompt] || '';
    const keyPoint = row[COL.keyPoint] || '';
    const note = row[COL.note] || '';

    process.stdout.write(`[${String(index + 1).padStart(3)}/${total}] ${caseId.padEnd(12)} ${(scene || '').slice(0, 20).padEnd(20)} `);

    const memoryBeforeCase = captureMemory('case_start', caseId);
    const memoryBlock = memoryGuardFailure();
    if (memoryBlock) {
      blockedCount++;
      process.stdout.write(`🔒 阻断 — ${memoryBlock.reason}\n`);
      allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: memoryBlock.verdict, reason: memoryBlock.reason, answer: '', elapsed: '', memoryBefore: memoryBeforeCase, memoryGuard: memoryBlock.memoryGuard });
      row[COL.round2] = memoryBlock.verdict;
      writeCheckpoint();
      break;
    }

    if (!prompt) {
      console.log('⏭️  跳过');
      allResults.push({ caseId, scene, prompt, keyPoint, verdict: '跳过', reason: '无 Prompt', answer: '', elapsed: '' });
      writeCheckpoint();
      continue;
    }

    let lastErr = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        process.stdout.write(`(重试${attempt}) `);
        const ok = await ensureServer();
        if (!ok) { process.stdout.write('❌ 服务器不可用\n'); break; }
      }
      captureMemory('attempt_start', caseId, attempt);

      try {
        const start = Date.now();
        const res = await sendChat(prompt);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const memoryAfterAttempt = captureMemory('attempt_end', caseId, attempt);

        // 检查是否需要重新登录
        if (isAuthRequired(res.answer, res.contractStatus)) {
          if (authRetryCount < 3) {
            authRetryCount++;
            console.log('🔐 登录态失效，弹出浏览器...');
            const loginOk = await promptLogin();
            if (loginOk) {
              // 重发这条用例
              try {
                const start2 = Date.now();
                const res2 = await sendChat(prompt);
                const elapsed2 = ((Date.now() - start2) / 1000).toFixed(1);
                const memoryAfterRetry = captureMemory('auth_retry_end', caseId, attempt);
                const ev2 = evaluate(caseId, scene, prompt, keyPoint, note, res2.answer, res2.intentType, res2.resultType, res2.contractStatus, res2.contractEvidence);
                const icon2 = ev2.verdict === '通过' ? '✅' : ev2.verdict === '阻断' ? '🔒' : '❌';
                if (ev2.verdict === '通过') passCount++; else if (ev2.verdict === '阻断') blockedCount++; else failCount++;
                process.stdout.write(`${icon2} ${ev2.verdict} (${elapsed2}s) — ${ev2.reason}\n`);
                allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: ev2.verdict, reason: ev2.reason, answer: res2.answer, intentType: res2.intentType, contractStatus: res2.contractStatus, contractEvidence: res2.contractEvidence, elapsed: elapsed2, memoryBefore: memoryBeforeCase, memoryAfter: memoryAfterRetry });
                row[COL.round2] = ev2.verdict;
                writeCheckpoint();
                lastErr = null;
                break;
              } catch (e2) {
                process.stdout.write(`❌ 重发失败: ${e2.message}\n`);
              }
            }
          }
          // 登录重试耗尽或登录失败
          blockedCount++;
          process.stdout.write('🔒 阻断 — 需要登录（重试已耗尽）\n');
          allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: '阻断', reason: '登录态失效且重试耗尽', answer: res.answer, intentType: res.intentType, contractStatus: res.contractStatus, contractEvidence: res.contractEvidence, elapsed, memoryBefore: memoryBeforeCase, memoryAfter: memoryAfterAttempt });
          row[COL.round2] = '阻断';
          writeCheckpoint();
          lastErr = null;
          break;
        }

        const ev = evaluate(caseId, scene, prompt, keyPoint, note, res.answer, res.intentType, res.resultType, res.contractStatus, res.contractEvidence);
        const icon = ev.verdict === '通过' ? '✅' : ev.verdict === '阻断' ? '🔒' : '❌';
        if (ev.verdict === '通过') passCount++; else if (ev.verdict === '阻断') blockedCount++; else failCount++;

        process.stdout.write(`${icon} ${ev.verdict} (${elapsed}s) — ${ev.reason}\n`);
        allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: ev.verdict, reason: ev.reason, answer: res.answer, intentType: res.intentType, contractStatus: res.contractStatus, contractEvidence: res.contractEvidence, elapsed, memoryBefore: memoryBeforeCase, memoryAfter: memoryAfterAttempt });
        row[COL.round2] = ev.verdict;
        writeCheckpoint();
        lastErr = null;
        break;

      } catch (err) {
        lastErr = err;
        const memoryAfterError = captureMemory('attempt_error', caseId, attempt);
        if (attempt === MAX_RETRIES) {
          errorCount++;
          process.stdout.write(`🚫 错误: ${err.message}\n`);
          allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: '错误', reason: err.message, answer: '', elapsed: '', memoryBefore: memoryBeforeCase, memoryAfter: memoryAfterError });
          row[COL.round2] = '错误';
          writeCheckpoint();
        }
      }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // ── 保存结果 ──
  let outputFile;

  if (sourceType === 'markdown') {
    outputFile = path.join(OUTPUT_DIR, `testcase-prompts-v1.1-results-${ts}.md`);
    const escapeMd = (value) => String(value || '').replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').slice(0, 500);
    const detailRows = [
      '# 第二轮测试结果',
      '',
      `测试集：${INPUT_FILE}`,
      '',
      `总计：${total} 条`,
      '',
      '| 编号 | Prompt | 结果 | 耗时(s) | 原因 | 回答摘要 |',
      '| --- | --- | --- | --- | --- | --- |',
      ...allResults.map(r => `| ${escapeMd(r.caseId)} | ${escapeMd(r.prompt)} | ${escapeMd(r.verdict)} | ${escapeMd(r.elapsed)} | ${escapeMd(r.reason)} | ${escapeMd((r.answer || '').slice(0, 200))} |`),
      '',
    ];
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputFile, detailRows.join('\n'), 'utf8');
  } else {
    outputFile = path.join(OUTPUT_DIR, `小乔智投测试集v1.1_second-round-${ts}.xlsx`);

    const outputRows = [headers];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][COL.id]) outputRows.push(rows[i]);
    }
    const newWb = XLSX.utils.book_new();
    const mainWs = XLSX.utils.aoa_to_sheet(outputRows);
    mainWs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 45 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(newWb, mainWs, '广告业务测试集');

    const detailHeaders = ['用例ID', '测试场景', 'Prompt', '关键点', '第一轮', '第二轮', '耗时(s)', '意图类型', '合约状态', '来源数', '证据数', '工具调用数', '过程事件数', '评估原因', '回答摘要(200字)'];
    const detailRows = [detailHeaders];
    for (const r of allResults) {
      const r1 = rows.find(rw => rw && String(rw[COL.id]).trim() === r.caseId)?.[COL.round1] || '';
      const evidence = r.contractEvidence || {};
      detailRows.push([
        r.caseId,
        r.scene,
        r.prompt,
        r.keyPoint,
        r1,
        r.verdict,
        r.elapsed,
        r.intentType || '',
        r.contractStatus || evidence.status || '',
        evidence.sourceRefCount || 0,
        evidence.evidenceRefCount || 0,
        evidence.toolCallTraceCount || 0,
        evidence.processEventCount || 0,
        r.reason,
        (r.answer || '').slice(0, 200),
      ]);
    }
    const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
    detailWs['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(newWb, detailWs, '详细结果');

    XLSX.writeFile(newWb, outputFile);
  }
  // ── 汇总 ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 第二轮测试完成');
  console.log(`   总计: ${total} 条`);
  console.log(`   ✅ 通过: ${passCount}`);
  console.log(`   🔒 阻断: ${blockedCount}`);
  console.log(`   ❌ 失败: ${failCount}`);
  console.log(`   🚫 错误: ${errorCount}`);
  console.log(`   通过率: ${((passCount / total) * 100).toFixed(1)}%`);
  console.log(`   结果文件: ${outputFile}`);
  console.log('='.repeat(60));
}

if (process.env.SECOND_ROUND_EVAL_SELF_TEST === '1') {
  runEvaluationSelfTest();
} else if (process.env.SECOND_ROUND_MEMORY_SELF_TEST === '1') {
  runMemoryGuardSelfTest();
} else {
  runAll().catch(console.error);
}






