const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://10.236.14.27:8002';
const CASE_ID = process.env.CASE_ID || 'MIG-OPEN-ABILITY';
const PROMPT = process.env.PROMPT || '你好，请用一句话说明你现在可以帮我做什么。';
const AUTH_STATE_PATH = process.env.AUTH_STATE_PATH || path.resolve(__dirname, '..', 'tmp', 'mig000-auth-state.json');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'review');
const runId = `${CASE_ID.toLowerCase()}-${Date.now()}`;

const mojibakeTokens = [
  '\u951b', '\u9428', '\u6d93', '\u7edb', '\u59dd', '\u93ba', '\u6fa7', '\u9225',
  '\u9473', '\u95c2', '\u7487', '\u59ab', '\u93cc', '\u7039', '\u9365', '\u6e1a',
  '\u9a9e', '\u9359', '\u6d7c', '\u6748', '\u9354', '\u5bee', '\u93c2', '\u6402',
  '\u3129', '\u951f', '\ufffd',
];
const densePattern = new RegExp('[\\u93ba\\u6fa7\\u9473\\u95c2\\u7487\\u59ab\\u93cc\\u7039\\u9365\\u6e1a\\u9a9e\\u9359\\u6d7c\\u6748\\u9354\\u5bee\\u93c2\\u9428\\u6d93\\u7edb\\u59dd]{2,}');
const externalClaimPattern = /已查询|已检索|已调用|已验证|已读取知识库|已联网|查询了公开|检索了公开|联网查询/;
const wrongRolePattern = /设计师助手|素材设计师|美术设计师|UI设计师/;
const internalLeakPattern = /response_contract|semantic_result|process_events|tool_calls|open_answer_planning|intentorch_candidate|planner_candidates|arbitration_summary|contract|schema/i;

function scan(label, value, findings) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text) return;
  if (mojibakeTokens.some((token) => text.includes(token)) || densePattern.test(text)) {
    findings.push({ label, preview: text.slice(0, 700) });
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchInPage(page, url) {
  return page.evaluate(async (target) => {
    const response = await fetch(target, { credentials: 'include' });
    const text = await response.text();
    return { status: response.status, text };
  }, url).catch((error) => ({ status: 0, text: String(error) }));
}

function metadataOf(message) {
  return message?.metadata && typeof message.metadata === 'object' ? message.metadata : {};
}

function contractOf(message) {
  const metadata = metadataOf(message);
  return metadata.response_contract || metadata.responseContract || message?.response_contract || null;
}

function processEventsOf(message) {
  const metadata = metadataOf(message);
  return Array.isArray(metadata.process_events) ? metadata.process_events : [];
}

function answerOf(message, contract) {
  return String(contract?.answer_markdown || contract?.answerMarkdown || message?.content || '').trim();
}

function planningOf(message, contract) {
  const metadata = metadataOf(message);
  return metadata.open_answer_planning
    || contract?.metadata?.open_answer_planning
    || contract?.answer_origin?.metadata?.open_answer_planning
    || metadata.answer_origin?.metadata?.open_answer_planning
    || null;
}

function evidenceModeOf(contract) {
  return contract?.evidence_mode || contract?.evidenceMode || contract?.metadata?.evidence_mode || '';
}

async function main() {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error(`Missing auth state: ${AUTH_STATE_PATH}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const findings = [];
  const consoleMessages = [];
  const failedRequests = [];
  const badResponses = [];
  const chatResponses = [];

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    storageState: AUTH_STATE_PATH,
  });
  await context.addInitScript(() => {
    localStorage.setItem('xiaoqiao_api_mode', 'local');
  });
  const page = await context.newPage();

  page.on('console', (message) => {
    const text = message.text();
    consoleMessages.push({ type: message.type(), text });
    scan(`console:${message.type()}`, text, findings);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText || '';
    if (!url.includes('_next/webpack-hmr')) failedRequests.push({ url, failure });
  });
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 && !url.includes('_next/webpack-hmr')) badResponses.push({ url, status });
    if (url.includes('/api/chat')) {
      const text = await response.text().catch((error) => String(error));
      chatResponses.push({ url, status, text });
      scan('sse:/api/chat', text, findings);
    }
  });

  await page.goto(`${BASE_URL}/?ui_check=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('#xiaoqiao-chat-composer');
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    const styles = getComputedStyle(node);
    return rect.width > 0
      && rect.height > 0
      && styles.visibility !== 'hidden'
      && styles.display !== 'none'
      && !node.disabled
      && !node.readOnly;
  }, null, { timeout: 90000 });

  const newChatButton = page.getByTitle('开启新对话');
  if (await newChatButton.isVisible().catch(() => false)) {
    await newChatButton.click({ force: true });
    await page.waitForTimeout(800);
  }

  const input = page.locator('#xiaoqiao-chat-composer');
  await input.fill(PROMPT, { timeout: 30000 });
  const sendButton = page.locator('[data-composer-control="send"], button[title="发送"], button[aria-label="发送"]').last();
  if (await sendButton.isVisible().catch(() => false)) {
    await sendButton.click({ force: true });
  } else {
    await input.press('Enter');
  }

  await page.waitForResponse((response) => response.url().includes('/api/chat') && response.status() === 200, { timeout: 150000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-composer-control="send"]');
    const text = document.body.innerText || '';
    return button?.getAttribute('data-composer-state') !== 'processing'
      && !text.includes('正在理解请求')
      && !text.includes('正在执行');
  }, null, { timeout: 150000 });
  await page.waitForTimeout(2000);

  const conversationId = await page.evaluate(() => localStorage.getItem('zhitou-chat-active-conversation-id') || '');
  if (!conversationId) throw new Error('Missing active conversation id');

  const conversationResponse = await fetchInPage(page, `/api/xiaoqiao/conversations/${conversationId}`);
  const messagesResponse = await fetchInPage(page, `/api/xiaoqiao/conversations/${conversationId}/messages`);
  scan('conversation-api', conversationResponse.text, findings);
  scan('messages-api', messagesResponse.text, findings);

  const messagesJson = parseJson(messagesResponse.text);
  const messages = Array.isArray(messagesJson) ? messagesJson : [];
  const assistantMessage = [...messages].reverse().find((item) => item.role === 'assistant');
  const contract = contractOf(assistantMessage);
  const processEvents = processEventsOf(assistantMessage);
  const answer = answerOf(assistantMessage, contract);
  const planning = planningOf(assistantMessage, contract);
  const evidenceMode = evidenceModeOf(contract);
  const pendingEvents = processEvents.filter((event) => event?.status === 'running');
  const intentOrchEvent = processEvents.find((event) => event?.type === 'intent_orch.candidate');
  const routeObservationEvent = processEvents.find((event) => event?.type === 'route_observation');
  const plannerCandidates = Array.isArray(planning?.planner_candidates) ? planning.planner_candidates : [];
  const arbitrationSummary = planning?.arbitration_summary && typeof planning.arbitration_summary === 'object'
    ? planning.arbitration_summary
    : null;
  const intentOrchCandidate = plannerCandidates.find((candidate) => candidate?.source === 'intentorch');
  const domText = await page.locator('body').innerText();
  scan('dom', domText, findings);

  const screenshotPath = path.join(OUT_DIR, `${runId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const normalizedAnswer = answer.replace(/\s+/g, ' ');
  const visibleText = domText.replace(/\s+/g, ' ');
  const oneSentenceLike = normalizedAnswer.length > 0
    && normalizedAnswer.length <= 180
    && !/[。！？.!?].+[。！？.!?]/.test(normalizedAnswer);
  const evidenceModeHealthy = [
    'model_only',
    'no_external_evidence_required',
    'mixed_context',
    'knowledge_grounded',
    'source_grounded',
    'tool_grounded',
    'mixed_grounded',
    'insufficient_evidence',
  ].includes(evidenceMode);
  const noUnsupportedExternalClaim = evidenceMode === 'model_only' || evidenceMode === 'no_external_evidence_required'
    ? !externalClaimPattern.test(answer)
    : true;
  const apiReadbackHealthy = conversationResponse.status === 200 && messagesResponse.status === 200 && Boolean(assistantMessage) && Boolean(contract);
  const chatResponseHealthy = chatResponses.some((item) => item.status === 200);
  const ignorableFailedRequests = failedRequests.filter((item) => {
    if (item.url.includes('/api/chat') && item.failure === 'net::ERR_ABORTED' && chatResponseHealthy && apiReadbackHealthy) return false;
    if (item.url.includes('_next/webpack-hmr')) return false;
    return true;
  });

  const acceptance = {
    pageLoaded: true,
    chatCompleted: chatResponseHealthy && apiReadbackHealthy,
    apiReadbackHealthy,
    answerQualityHealthy: oneSentenceLike && !wrongRolePattern.test(answer) && !internalLeakPattern.test(answer) && normalizedAnswer.length >= 8,
    evidenceModeHealthy,
    noUnsupportedExternalClaim,
    intentOrchObservable: Boolean(intentOrchEvent || intentOrchCandidate),
    planningMetadataHealthy: Boolean(planning && plannerCandidates.length >= 1 && arbitrationSummary?.final_authority === 'contract_safety'),
    routeObservationHealthy: !routeObservationEvent || !/mismatch\(es\)|Route observation/i.test(String(routeObservationEvent.summary || '')),
    noPendingRuntimeEvents: pendingEvents.length === 0,
    consoleHealthy: consoleMessages.every((item) => item.type !== 'error'),
    networkHealthy: ignorableFailedRequests.length === 0 && badResponses.length === 0,
    noMojibake: findings.length === 0,
  };

  const report = {
    caseId: CASE_ID,
    prompt: PROMPT,
    runId,
    baseUrl: BASE_URL,
    conversationId,
    screenshotPath,
    answer,
    evidenceMode,
    planning,
    intentOrchEvent,
    routeObservationEvent,
    processEventTypes: processEvents.map((event) => event?.type).filter(Boolean),
    pendingEventCount: pendingEvents.length,
    chatResponseCount: chatResponses.length,
    consoleMessages,
    failedRequests,
    badResponses,
    mojibakeFindings: findings,
    domPreview: visibleText.slice(0, 3000),
    acceptance,
    failureReason: '',
    passed: false,
  };
  report.passed = Object.values(acceptance).every(Boolean);
  report.failureReason = report.passed
    ? ''
    : Object.entries(acceptance).filter(([, value]) => !value).map(([key]) => key).join(', ');

  const reportPath = path.join(OUT_DIR, `${runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({
    reportPath,
    screenshotPath,
    passed: report.passed,
    failureReason: report.failureReason,
    answer,
    evidenceMode,
    acceptance,
    planningSummary: {
      candidateCount: plannerCandidates.length,
      hasIntentOrchCandidate: Boolean(intentOrchCandidate),
      hasIntentOrchEvent: Boolean(intentOrchEvent),
      finalAuthority: arbitrationSummary?.final_authority,
    },
    mojibakeFindings: findings,
  }, null, 2));
  if (!report.passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
