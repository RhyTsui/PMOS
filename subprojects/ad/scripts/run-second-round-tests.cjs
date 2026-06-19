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

const BASE_URL = 'http://localhost:8002';
const TIMEOUT_MS = 90000;
const MAX_RETRIES = 2;
const SERVER_RESTART_WAIT = 15000;
const SERVER_DIR = 'E:/AI/ai-os/subprojects/ad/frontend/src';

const INPUT_FILE = path.resolve('E:/AI/ai-os/docs/sources/inbox/小乔智投测试集v1.1.xlsx');
const OUTPUT_DIR = path.resolve('E:/AI/ai-os/subprojects/ad/docs/review');
const AUTH_FILE = path.resolve('E:/AI/ai-os/subprojects/ad/tmp/auth-state.json');

// ── 加载认证状态 ──
let authCookies = [];

function loadAuth() {
  try {
    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    authCookies = authData.cookies || [];
    console.log(`🔑 已加载登录态: token=${(authData.token || '').slice(0, 30)}...`);
    return true;
  } catch (e) {
    console.warn('⚠️  未找到登录态文件');
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

// ── 读取测试集 ──
const wb = XLSX.readFile(INPUT_FILE);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
const headers = rows[0];
console.log(`📋 读取测试集: ${wb.SheetNames[0]}, ${rows.length - 1} 条用例`);

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
  console.log('  ⚠️  服务器无响应，尝试重启...');
  try { execSync('taskkill /F /IM tsx.exe 2>nul', { stdio: 'ignore' }); } catch {}
  await new Promise(r => setTimeout(r, 3000));
  execSync(`cd "${SERVER_DIR}" && start /B cmd /c "pnpm dev 2>&1"`, { stdio: 'ignore', windowsVerbatimArguments: true });
  console.log(`  等待 ${SERVER_RESTART_WAIT / 1000}s ...`);
  await new Promise(r => setTimeout(r, SERVER_RESTART_WAIT));
  return await checkServer();
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
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            streamEvents.push(evt);
            if (evt.type === 'done') {
              doneEvent = evt;
              answer = evt.result?.answer || '';
              intentType = evt.result?.response_contract?.intent_type || '';
              resultType = evt.result?.response_contract?.result_type || '';
              contractStatus = evt.result?.response_contract?.status || '';
            }
          } catch {}
        }
      });

      res.on('end', () => resolve({
        answer,
        intentType,
        resultType,
        contractStatus,
        contractEvidence: summarizeContractEvidence(doneEvent, streamEvents),
        ok: true,
      }));
      res.on('error', reject);
    });

    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timeout (${TIMEOUT_MS / 1000}s)`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 评估 ──
function evaluate(caseId, scene, keyPoint, note, answer, intentType, resultType, contractStatus, contractEvidence = {}) {
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

// ── 主流程 ──
async function runAll() {
  const selectedCaseIds = requestedCaseIdSet();
  const runnableRows = rows
    .slice(1)
    .filter(row => row && row[COL.id])
    .filter(row => !selectedCaseIds || selectedCaseIds.has(String(row[COL.id]).trim()));
  const total = runnableRows.length;
  let passCount = 0, failCount = 0, blockedCount = 0, errorCount = 0;
  const allResults = [];
  const ts = timestampForFilename();
  const checkpointFile = path.join(OUTPUT_DIR, `小乔智投测试集v1.1_second-round-${ts}.checkpoint.json`);

  function writeCheckpoint() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(checkpointFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      selectedCaseIds: selectedCaseIds ? Array.from(selectedCaseIds) : null,
      total,
      passCount,
      failCount,
      blockedCount,
      errorCount,
      results: allResults,
    }, null, 2));
  }

  // 先加载认证
  if (!loadAuth()) {
    const loginOk = await promptLogin();
    if (!loginOk) {
      console.error('❌ 无法登录，终止测试');
      process.exit(1);
    }
  }

  // 确认服务器可用
  const serverOk = await ensureServer();
  if (!serverOk) {
    console.error('❌ 服务器无法启动');
    process.exit(1);
  }
  console.log('✅ 服务器就绪\n');

  if (!await checkAuth()) {
    console.log('🔐 登录态已失效，先刷新登录...');
    const loginOk = await promptLogin();
    if (!loginOk || !await checkAuth()) {
      console.error('❌ 登录态刷新失败，终止测试');
      process.exit(1);
    }
  }

  let authRetryCount = 0;

  for (let index = 0; index < runnableRows.length; index++) {
    const row = runnableRows[index];

    const caseId = String(row[COL.id]).trim();
    const scene = row[COL.scene] || '';
    const prompt = row[COL.prompt] || '';
    const keyPoint = row[COL.keyPoint] || '';
    const note = row[COL.note] || '';

    process.stdout.write(`[${String(index + 1).padStart(3)}/${total}] ${caseId.padEnd(12)} ${(scene || '').slice(0, 20).padEnd(20)} `);

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

      try {
        const start = Date.now();
        const res = await sendChat(prompt);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

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
                const ev2 = evaluate(caseId, scene, keyPoint, note, res2.answer, res2.intentType, res2.resultType, res2.contractStatus, res2.contractEvidence);
                const icon2 = ev2.verdict === '通过' ? '✅' : ev2.verdict === '阻断' ? '🔒' : '❌';
                if (ev2.verdict === '通过') passCount++; else if (ev2.verdict === '阻断') blockedCount++; else failCount++;
                process.stdout.write(`${icon2} ${ev2.verdict} (${elapsed2}s) — ${ev2.reason}\n`);
                allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: ev2.verdict, reason: ev2.reason, answer: res2.answer, intentType: res2.intentType, contractStatus: res2.contractStatus, contractEvidence: res2.contractEvidence, elapsed: elapsed2 });
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
          allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: '阻断', reason: '登录态失效且重试耗尽', answer: res.answer, intentType: res.intentType, contractStatus: res.contractStatus, contractEvidence: res.contractEvidence, elapsed });
          row[COL.round2] = '阻断';
          writeCheckpoint();
          lastErr = null;
          break;
        }

        const ev = evaluate(caseId, scene, keyPoint, note, res.answer, res.intentType, res.resultType, res.contractStatus, res.contractEvidence);
        const icon = ev.verdict === '通过' ? '✅' : ev.verdict === '阻断' ? '🔒' : '❌';
        if (ev.verdict === '通过') passCount++; else if (ev.verdict === '阻断') blockedCount++; else failCount++;

        process.stdout.write(`${icon} ${ev.verdict} (${elapsed}s) — ${ev.reason}\n`);
        allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: ev.verdict, reason: ev.reason, answer: res.answer, intentType: res.intentType, contractStatus: res.contractStatus, contractEvidence: res.contractEvidence, elapsed });
        row[COL.round2] = ev.verdict;
        writeCheckpoint();
        lastErr = null;
        break;

      } catch (err) {
        lastErr = err;
        if (attempt === MAX_RETRIES) {
          errorCount++;
          process.stdout.write(`🚫 错误: ${err.message}\n`);
          allResults.push({ caseId, scene, prompt, keyPoint, note, verdict: '错误', reason: err.message, answer: '', elapsed: '' });
          row[COL.round2] = '错误';
          writeCheckpoint();
        }
      }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // ── 保存结果 ──
  const outputFile = path.join(OUTPUT_DIR, `小乔智投测试集v1.1_second-round-${ts}.xlsx`);

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

runAll().catch(console.error);
