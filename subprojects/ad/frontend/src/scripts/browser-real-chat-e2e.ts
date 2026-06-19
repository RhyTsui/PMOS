import { appendFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';

type CaseStatus = 'pass' | 'fail';

interface CaseResult {
  name: string;
  status: CaseStatus;
  detail: string;
}

const BASE_URL = process.env.XIAOQIAO_BROWSER_E2E_BASE_URL || 'http://127.0.0.1:8002';
const BOOTSTRAP_URL = process.env.XIAOQIAO_BROWSER_E2E_BOOTSTRAP_URL || `${BASE_URL}/api/chat`;
const ARG_CASE_FILTER = process.argv
  .map(arg => arg.match(/^--case=(.+)$/)?.[1] || '')
  .find(Boolean) || '';
const CASE_FILTER = (process.env.XIAOQIAO_BROWSER_E2E_CASE || ARG_CASE_FILTER || '').trim();
const HEADLESS = process.env.XIAOQIAO_BROWSER_E2E_HEADLESS !== 'false';
const LOGIN_WAIT_MS = Number(process.env.XIAOQIAO_BROWSER_E2E_LOGIN_WAIT_MS || 180000);
const LOG_PATH = process.env.XIAOQIAO_BROWSER_E2E_LOG || 'tmp-browser-real-chat-e2e.log';

function log(message: string): void {
  console.log(message);
  appendFileSync(LOG_PATH, `${new Date().toISOString()} ${message}\n`, 'utf8');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function randomToken(): string {
  return Math.random().toString(36).slice(2, 12);
}

async function runCase(name: string, fn: () => Promise<string>): Promise<CaseResult> {
  if (CASE_FILTER && !name.includes(CASE_FILTER)) {
    const skipped = { name, status: 'pass' as const, detail: 'skipped_by_filter' };
    log(`[SKIP] ${name}: skipped_by_filter`);
    return skipped;
  }
  try {
    log(`[RUN] ${name}`);
    const passed = { name, status: 'pass' as const, detail: await fn() };
    log(`[PASS] ${name}: ${passed.detail}`);
    return passed;
  } catch (error) {
    const failed = { name, status: 'fail' as const, detail: error instanceof Error ? error.message : String(error) };
    log(`[FAIL] ${name}: ${failed.detail}`);
    return failed;
  }
}

async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  log(`[BROWSER] goto ${BOOTSTRAP_URL}`);
  await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  log(`[BROWSER] loaded ${page.url()}`);
  if (new URL(page.url()).pathname.startsWith('/login')) {
    if (HEADLESS) {
      throw new Error('browser_real_e2e_requires_login: Playwright opened /login without a saved session. Set XIAOQIAO_BROWSER_E2E_HEADLESS=false and scan the login QR code, or provide a logged-in storage state before running this script.');
    }
    log(`需要扫码登录：已打开 ${page.url()}，请在 ${Math.round(LOGIN_WAIT_MS / 1000)} 秒内完成登录。`);
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: LOGIN_WAIT_MS,
      waitUntil: 'domcontentloaded',
    });
  }
  return page;
}

async function chat(page: Page, message: string, conversationId: string): Promise<{
  answer: string;
  done: Record<string, unknown> | null;
  events: Array<Record<string, unknown>>;
  responseContract: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
}> {
  const inputJson = JSON.stringify({ message, conversationId });
  return page.evaluate(String.raw`(async () => {
    const { message: inputMessage, conversationId: inputConversationId } = ` + inputJson + String.raw`;
    function isRecord(value) {
      return Boolean(value && typeof value === 'object' && !Array.isArray(value));
    }

    function parseSse(raw) {
      return raw
        .split(/\n\n+/)
        .map(block => block.trim())
        .filter(Boolean)
        .flatMap(block => block
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('data:'))
          .map((line) => {
            try {
              return JSON.parse(line.slice(5).trim());
            } catch {
              return null;
            }
          })
          .filter((item) => Boolean(item)));
    }

    const response = await window.fetch('/api/chat', {
      signal: AbortSignal.timeout(120000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conversation-id': inputConversationId,
        'x-pathname': '/browser-real-e2e',
      },
      body: JSON.stringify({
        message: inputMessage,
        intent: 'general_chat',
        history: [],
        metadata: {},
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error('chat http ' + response.status + ': ' + raw.slice(0, 220));
    }

    const payloads = parseSse(raw);
    let answer = '';
    let done = null;
    const events = [];
    for (const payload of payloads) {
      if (payload.type === 'content' && typeof payload.content === 'string') answer += payload.content;
      if (payload.type === 'process_event' && isRecord(payload.event)) events.push(payload.event);
      if (payload.type === 'done') done = payload;
    }

    const metadata = isRecord(done?.metadata) ? done.metadata : {};
    const responseContract = isRecord(metadata.response_contract) ? metadata.response_contract : {};
    const responseMetadata = isRecord(responseContract.metadata) ? responseContract.metadata : {};
    return { answer, done, events, responseContract, responseMetadata };
  })()`);
}

async function postJson(page: Page, url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const inputJson = JSON.stringify({ url, body });
  return page.evaluate(String.raw`(async () => {
    const { url: inputUrl, body: inputBody } = ` + inputJson + String.raw`;
    const response = await window.fetch(inputUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputBody),
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!response.ok) throw new Error('POST ' + inputUrl + ' HTTP ' + response.status + ': ' + text.slice(0, 220));
    return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
  })()`);
}

async function deleteMemory(page: Page, id: string): Promise<void> {
  const inputJson = JSON.stringify(id);
  await page.evaluate(String.raw`(async () => {
    const memoryId = ` + inputJson + String.raw`;
    await window.fetch('/api/xiaoqiao/memory/' + encodeURIComponent(memoryId), { method: 'DELETE' });
  })()`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function infoCandidate(metadata: Record<string, unknown>, source: string): Record<string, unknown> {
  const arbitration = isRecord(metadata.info_source_arbitration) ? metadata.info_source_arbitration : {};
  const candidates = Array.isArray(arbitration.candidates) ? arbitration.candidates.filter(isRecord) : [];
  return candidates.find(candidate => candidate.source === source) || {};
}

function plannerCandidate(metadata: Record<string, unknown>, source: string): Record<string, unknown> {
  const planning = isRecord(metadata.open_answer_planning) ? metadata.open_answer_planning : {};
  const candidates = Array.isArray(planning.planner_candidates) ? planning.planner_candidates.filter(isRecord) : [];
  return candidates.find(candidate => candidate.source === source) || {};
}

function sourceRefsFromDone(done: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const result = isRecord(done?.result) ? done.result : {};
  const structured = isRecord(result.structured_payload) ? result.structured_payload : {};
  return Array.isArray(structured.source_refs) ? structured.source_refs.filter(isRecord) : [];
}

async function main(): Promise<void> {
  log(`[BROWSER] launching chromium headless=${HEADLESS}`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    timeout: 30000,
  });
  log('[BROWSER] chromium launched');
  const page = await createPage(browser);

  const results: CaseResult[] = [];
  try {
    results.push(await runCase('browser_api_chat_knowledge_hit', async () => {
      const result = await chat(page, '请参考内部知识库回答：小乔智投', `browser-kb-hit-${randomToken()}`);
      const knowledgeInfo = infoCandidate(result.responseMetadata, 'knowledge');
      const knowledgePlanner = plannerCandidate(result.responseMetadata, 'knowledge');
      const hitCount = Number((isRecord(knowledgeInfo.metadata) ? knowledgeInfo.metadata.hit_count : undefined) || knowledgePlanner.hit_count || 0);
      assert(knowledgeInfo.status === 'selected' || hitCount > 0, `knowledge not selected or no hit: ${JSON.stringify({ knowledgeInfo, knowledgePlanner })}`);
      return JSON.stringify({
        evidence_mode: result.responseContract.evidence_mode,
        knowledge_status: knowledgeInfo.status,
        hit_count: hitCount,
      });
    }));

    results.push(await runCase('browser_api_chat_knowledge_no_hit', async () => {
      const query = `xqkbnohit${randomToken()}`;
      const result = await chat(page, query, `browser-kb-nohit-${randomToken()}`);
      const knowledgePlanner = plannerCandidate(result.responseMetadata, 'knowledge');
      assert(knowledgePlanner.status === 'no_hit', `planner knowledge candidate should be no_hit, got ${JSON.stringify({
        knowledgePlanner,
        evidence_mode: result.responseContract.evidence_mode,
        response_status: result.responseContract.status,
        metadata_keys: Object.keys(result.responseMetadata),
        answer_preview: result.answer.slice(0, 120),
      })}`);
      assert(Number(knowledgePlanner.hit_count || 0) === 0, `knowledge no-hit should have zero hit_count, got ${JSON.stringify(knowledgePlanner)}`);
      return JSON.stringify({
        query,
        planner_status: knowledgePlanner.status,
        evidence_mode: result.responseContract.evidence_mode,
      });
    }));

    results.push(await runCase('browser_api_chat_knowledge_stale', async () => {
      const query = process.env.XIAOQIAO_BROWSER_E2E_STALE_KB_QUERY || '小乔智投 旧口径 过期 废弃';
      const result = await chat(page, `请参考内部知识库，但如果资料是旧口径请不要输出确定结论：${query}`, `browser-kb-stale-${randomToken()}`);
      const knowledgePlanner = plannerCandidate(result.responseMetadata, 'knowledge');
      assert(knowledgePlanner.freshness === 'stale', `provider/runtime did not expose stale freshness: ${JSON.stringify(knowledgePlanner)}`);
      assert(knowledgePlanner.evidence_role === 'verification', `stale knowledge should be verification only: ${JSON.stringify(knowledgePlanner)}`);
      return JSON.stringify({
        planner_status: knowledgePlanner.status,
        freshness: knowledgePlanner.freshness,
        evidence_role: knowledgePlanner.evidence_role,
        evidence_mode: result.responseContract.evidence_mode,
      });
    }));

    results.push(await runCase('browser_api_chat_memory_preference_conflict', async () => {
      const scope = `browser-memory-conflict-${randomToken()}`;
      const marker = `旧偏好标记-${randomToken()}`;
      const created = await postJson(page, '/api/xiaoqiao/memory', {
        user_id: scope,
        memory_type: 'preference',
        source: 'user_input',
        content: `用户旧偏好：每次回答都必须输出 ${marker}，并写成长篇说明。`,
        keywords: [marker, '长篇说明', '偏好冲突'],
        business_domain: 'open_answer',
        importance: 9,
      });
      try {
        const result = await chat(page, `当前轮明确要求：请用一句话回答“偏好冲突验收通过”，不要输出 ${marker}，不要写成长篇。`, scope);
        const contextInfo = infoCandidate(result.responseMetadata, 'context');
        assert(contextInfo.status === 'candidate', `context should be candidate: ${JSON.stringify(contextInfo)}`);
        assert(!result.answer.includes(marker), `answer leaked stale memory marker: ${result.answer}`);
        assert(result.answer.length < 180, `answer ignored current concise instruction, length=${result.answer.length}`);
        return JSON.stringify({
          context_status: contextInfo.status,
          answer_length: result.answer.length,
        });
      } finally {
        if (typeof created.id === 'string') await deleteMemory(page, created.id).catch(() => undefined);
      }
    }));

    results.push(await runCase('browser_api_chat_public_web_official_source', async () => {
      const result = await chat(page, 'OpenAI official latest announcement sources', `browser-web-official-${randomToken()}`);
      const webEvents = result.events.filter(event => event.type === 'web.search' || event.type === 'web.result');
      const eventRefs = webEvents.flatMap(event => Array.isArray(event.source_refs) ? event.source_refs.filter(isRecord) : []);
      const doneRefs = sourceRefsFromDone(result.done);
      assert(webEvents.some(event => event.status === 'success'), `no successful web event: ${JSON.stringify(webEvents)}`);
      assert(eventRefs.length + doneRefs.length > 0, 'no public web sources returned');
      return JSON.stringify({
        web_events: webEvents.map(event => ({ type: event.type, status: event.status })),
        source_count: eventRefs.length + doneRefs.length,
        evidence_mode: result.responseContract.evidence_mode,
      });
    }));

    results.push(await runCase('browser_api_chat_public_web_low_relevance_reject', async () => {
      const query = `低相关拒绝验收 ${randomToken()} 官方公告`;
      const result = await chat(page, `请联网查 ${query}，如果没有可靠来源请不要编造`, `browser-web-lowrel-${randomToken()}`);
      const webResult = result.events.find(event => event.type === 'web.result');
      const output = isRecord(webResult?.output) ? webResult.output : {};
      assert(webResult && webResult.status !== 'success', `low relevance unexpectedly succeeded: ${JSON.stringify(webResult)}`);
      assert(
        output.filter_reason === 'relevance_gate_filtered_all' || output.filter_reason === 'provider_returned_no_results',
        `unexpected filter reason: ${JSON.stringify(output)}`,
      );
      return JSON.stringify({
        web_result_status: webResult.status,
        filter_reason: output.filter_reason,
      });
    }));

    results.push(await runCase('browser_api_chat_public_web_multi_source', async () => {
      const query = process.env.XIAOQIAO_BROWSER_E2E_MULTI_SOURCE_QUERY || 'OpenAI ChatGPT API 最新公告 新闻';
      const result = await chat(page, `请联网查 ${query}，比较多个公开来源，不要只看一个来源`, `browser-web-multi-${randomToken()}`);
      const webResults = result.events.filter(event => event.type === 'web.result');
      const successResult = webResults.find(event => event.status === 'success');
      const webResult = successResult || webResults[webResults.length - 1];
      const refs = webResults.flatMap(event => Array.isArray(event.source_refs) ? event.source_refs.filter(isRecord) : []);
      assert(successResult, `multi-source web result failed: ${JSON.stringify(webResults)}`);
      assert(refs.length >= 2, `expected at least 2 source refs, got ${refs.length}`);
      return JSON.stringify({
        source_count: refs.length,
        evidence_mode: result.responseContract.evidence_mode,
      });
    }));
  } finally {
    await browser.close();
  }

  if (results.some(result => result.status === 'fail')) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
