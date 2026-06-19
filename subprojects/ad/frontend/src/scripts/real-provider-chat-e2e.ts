import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getKnowledgeBaseApiKey,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  getPublicWebConfig,
  hasConfiguredKnowledgeCredentials,
  resolveKnowledgeBaseIds,
} from '../src/lib/runtime-config';
import { detectPublicWebNeed, executePublicWebQuery } from '../src/lib/public-web-runtime';
import { runChatRuntimeForEvaluation } from '../src/lib/evaluation-runtime-runner';
import { runtimeDataPath } from '../src/lib/runtime-data-path';

type CaseStatus = 'pass' | 'fail' | 'skip';

interface CaseResult {
  name: string;
  status: CaseStatus;
  evidenceTier: 'real_provider';
  detail: string;
}

interface CaseSkip {
  status: 'skip';
  detail: string;
}

interface KnowledgeHit {
  title?: string;
  content?: string;
  source?: string;
  freshness?: string;
  stale?: unknown;
  is_stale?: unknown;
  outdated?: unknown;
  expired?: unknown;
  deprecated?: unknown;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

let localSamplesCache: Promise<Record<string, string>> | undefined;

async function loadLocalSamples(): Promise<Record<string, string>> {
  const samplePath = runtimeDataPath('real-provider-e2e-samples.json');
  try {
    const raw = await readFile(samplePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        output[key] = value.trim();
      }
    }
    return output;
  } catch {
    return {};
  }
}

async function requiredSample(name: string): Promise<string> {
  const value = process.env[name]?.trim();
  if (value) return value;
  localSamplesCache ||= loadLocalSamples();
  const localSamples = await localSamplesCache;
  const localValue = localSamples[name]?.trim();
  assert(
    localValue,
    `${name} is required for strict real-provider validation; set it as an environment variable or in ${runtimeDataPath('real-provider-e2e-samples.json')}; do not replace it with mocked, default, random, or fixture data`,
  );
  return localValue;
}

async function optionalSample(name: string): Promise<string | undefined> {
  const value = process.env[name]?.trim();
  if (value) return value;
  localSamplesCache ||= loadLocalSamples();
  const localSamples = await localSamplesCache;
  const localValue = localSamples[name]?.trim();
  return localValue || undefined;
}

function getResponseContract(result: Awaited<ReturnType<typeof runChatRuntimeForEvaluation>>): Record<string, unknown> {
  const metadata = isRecord(result.done_payload?.metadata) ? result.done_payload.metadata : {};
  return isRecord(metadata.response_contract) ? metadata.response_contract : {};
}

function getResponseMetadata(result: Awaited<ReturnType<typeof runChatRuntimeForEvaluation>>): Record<string, unknown> {
  const contract = getResponseContract(result);
  return isRecord(contract.metadata) ? contract.metadata : {};
}

function findInfoSourceCandidate(metadata: Record<string, unknown>, source: string): Record<string, unknown> {
  const arbitration = isRecord(metadata.info_source_arbitration) ? metadata.info_source_arbitration : {};
  const candidates = Array.isArray(arbitration.candidates) ? arbitration.candidates.filter(isRecord) : [];
  return candidates.find(candidate => candidate.source === source) || {};
}

function findPlannerCandidate(metadata: Record<string, unknown>, source: string): Record<string, unknown> {
  const planning = isRecord(metadata.open_answer_planning) ? metadata.open_answer_planning : {};
  const candidates = Array.isArray(planning.planner_candidates) ? planning.planner_candidates.filter(isRecord) : [];
  return candidates.find(candidate => candidate.source === source) || {};
}

const KNOWLEDGE_FRESHNESS_KEYS = new Set([
  'freshness',
  'status',
  'lifecycle_status',
  'lifecycleStatus',
  'validity',
  'state',
  'version_status',
  'versionStatus',
]);

const KNOWLEDGE_STALE_FLAG_KEYS = new Set([
  'stale',
  'is_stale',
  'isStale',
  'outdated',
  'expired',
  'deprecated',
  'isDeprecated',
  'isOutdated',
  'isExpired',
]);

function normalizeFreshnessValue(value: unknown): 'fresh' | 'stale' | 'unknown' {
  const freshness = String(value || '').trim().toLowerCase();
  if (!freshness) return 'unknown';
  if (['fresh', 'current', 'active', 'valid', 'latest'].includes(freshness)) return 'fresh';
  if (['stale', 'old', 'outdated', 'expired', 'deprecated', 'inactive', 'archived', 'superseded'].includes(freshness)) return 'stale';
  return 'unknown';
}

function normalizeStaleFlag(value: unknown): 'fresh' | 'stale' | 'unknown' {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'stale';
  if (value === false || value === 'false' || value === 0 || value === '0') return 'fresh';
  return 'unknown';
}

function staleSignal(hit: KnowledgeHit): boolean {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: hit, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current || current.depth > 4) continue;
    const value = current.value;
    if (Array.isArray(value)) {
      value.slice(0, 8).forEach(item => stack.push({ value: item, depth: current.depth + 1 }));
      continue;
    }
    if (!isRecord(value)) continue;
    for (const [key, child] of Object.entries(value)) {
      if (KNOWLEDGE_FRESHNESS_KEYS.has(key) && normalizeFreshnessValue(child) === 'stale') return true;
      if (KNOWLEDGE_STALE_FLAG_KEYS.has(key) && normalizeStaleFlag(child) === 'stale') return true;
      if (isRecord(child) || Array.isArray(child)) {
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
  return false;
}

async function searchRealKnowledge(query: string): Promise<{ hits: KnowledgeHit[]; knowledgeBaseCount: number }> {
  const config = await getModelServiceConfig();
  const endpoint = getKnowledgeSearchEndpoint(config);
  assert(hasConfiguredKnowledgeCredentials(config), 'knowledge provider credentials are not configured');
  assert(endpoint, 'knowledge search endpoint is not configured');
  const knowledgeBaseIds = await resolveKnowledgeBaseIds(config);
  assert(knowledgeBaseIds.length > 0, 'no accessible knowledge base id resolved from real provider');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKnowledgeBaseApiKey(config),
    },
    body: JSON.stringify({
      query,
      top_k: 5,
      knowledge_base_ids: knowledgeBaseIds,
    }),
  });
  assert(response.ok, `knowledge search failed with HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  const record = isRecord(data) ? data : {};
  const rawItems = Array.isArray(record.data)
    ? record.data
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.results)
        ? record.results
        : [];
  return {
    hits: rawItems.filter(isRecord) as KnowledgeHit[],
    knowledgeBaseCount: knowledgeBaseIds.length,
  };
}

function skipCase(detail: string): CaseSkip {
  return { status: 'skip', detail };
}

function isCaseSkip(value: unknown): value is CaseSkip {
  return isRecord(value) && value.status === 'skip' && typeof value.detail === 'string';
}

async function runCase(name: string, fn: () => Promise<string | CaseSkip>): Promise<CaseResult> {
  try {
    const detail = await fn();
    if (isCaseSkip(detail)) {
      return { name, status: 'skip', evidenceTier: 'real_provider', detail: detail.detail };
    }
    return { name, status: 'pass', evidenceTier: 'real_provider', detail };
  } catch (error) {
    return { name, status: 'fail', evidenceTier: 'real_provider', detail: error instanceof Error ? error.message : String(error) };
  }
}

async function assertKnowledgeHitCase(): Promise<string> {
  const query = await requiredSample('XIAOQIAO_REAL_KB_HIT_QUERY');
  const direct = await searchRealKnowledge(query);
  assert(direct.hits.length > 0, 'direct real knowledge search returned no hit');

  const result = await runChatRuntimeForEvaluation({
    conversationId: `real-kb-hit-${Date.now()}`,
    message: `请参考内部知识库回答：${query}`,
    scenario: 'general_chat',
  });
  const metadata = getResponseMetadata(result);
  const infoCandidate = findInfoSourceCandidate(metadata, 'knowledge');
  const plannerCandidate = findPlannerCandidate(metadata, 'knowledge');

  assert.equal(infoCandidate.status, 'selected', 'knowledge should be selected by information source arbitration');
  assert(Number(isRecord(infoCandidate.metadata) ? infoCandidate.metadata.hit_count : 0) > 0, 'information source metadata should expose real knowledge hit count');
  assert(Number(plannerCandidate.hit_count || 0) > 0, 'planner metadata should expose real knowledge hit count');
  return `query="${query}", direct_hits=${direct.hits.length}, planner_hits=${plannerCandidate.hit_count}`;
}

async function assertKnowledgeNoHitCase(): Promise<string> {
  const query = await requiredSample('XIAOQIAO_REAL_KB_NO_HIT_QUERY');
  const direct = await searchRealKnowledge(query);
  assert.equal(direct.hits.length, 0, `direct real knowledge no-hit query unexpectedly returned ${direct.hits.length} hits`);

  const result = await runChatRuntimeForEvaluation({
    conversationId: `real-kb-nohit-${Date.now()}`,
    message: `请只参考内部知识库回答：${query}`,
    scenario: 'general_chat',
  });
  const metadata = getResponseMetadata(result);
  const plannerCandidate = findPlannerCandidate(metadata, 'knowledge');
  assert.equal(plannerCandidate.status, 'no_hit', `planner should record real knowledge no-hit status, got ${JSON.stringify(plannerCandidate)}`);
  assert.equal(Number(plannerCandidate.hit_count || 0), 0, 'planner no-hit case should have zero hit count');
  return `query="${query}", planner_status=${plannerCandidate.status}`;
}

async function assertKnowledgeStaleCase(): Promise<string | CaseSkip> {
  const query = await optionalSample('XIAOQIAO_REAL_KB_STALE_QUERY');
  if (!query) {
    return skipCase('no real stale/expired/deprecated knowledge sample is currently available; keep this as a future knowledge-governance acceptance case');
  }
  const direct = await searchRealKnowledge(query);
  const staleHits = direct.hits.filter(staleSignal);
  assert(
    staleHits.length > 0,
    'real knowledge provider returned no stale/expired/deprecated freshness signal for the configured stale query',
  );

  const result = await runChatRuntimeForEvaluation({
    conversationId: `real-kb-stale-${Date.now()}`,
    message: `请参考内部知识库，但如果资料是旧口径请不要输出确定结论：${query}`,
    scenario: 'general_chat',
  });
  const responseContract = getResponseContract(result);
  const metadata = getResponseMetadata(result);
  const plannerCandidate = findPlannerCandidate(metadata, 'knowledge');
  assert.equal(plannerCandidate.freshness, 'stale', 'planner should preserve stale knowledge freshness');
  assert.equal(plannerCandidate.evidence_role, 'verification', 'stale knowledge should be verification only');
  assert.equal(responseContract.evidence_mode, 'insufficient_evidence', 'stale knowledge should require refreshed evidence');
  return `query="${query}", stale_hits=${staleHits.length}`;
}

async function assertPublicWebConfigured(): Promise<string> {
  const config = await getPublicWebConfig();
  assert(config.enabled, 'real public web provider is disabled');
  assert(config.searchEndpoint, 'real public web search endpoint is not configured');
  return `${config.providerLabel} ${config.method}`;
}

async function assertPublicWebOfficialCase(): Promise<string> {
  await assertPublicWebConfigured();
  const query = await requiredSample('XIAOQIAO_REAL_WEB_OFFICIAL_QUERY');
  const officialDomain = process.env.XIAOQIAO_REAL_WEB_OFFICIAL_DOMAIN?.trim();
  const need = await detectPublicWebNeed(query, { context: { routeIntent: 'general' } });
  assert.equal(need.required, true, 'official public query should require public web');
  const result = await executePublicWebQuery(query, need);
  assert.equal(result.status, 'success', `public web official query failed: ${result.reasonCode}`);
  assert(result.sourceRefs.length > 0, 'official public query should return source refs');
  if (officialDomain) {
    assert(
      result.sourceRefs.some(source => String(source.url || '').includes(officialDomain)),
      `no source matched expected official domain ${officialDomain}`,
    );
  }
  return `query="${query}", sources=${result.sourceRefs.length}`;
}

async function assertPublicWebLowRelevanceCase(): Promise<string> {
  await assertPublicWebConfigured();
  const query = await requiredSample('XIAOQIAO_REAL_WEB_LOW_RELEVANCE_QUERY');
  const need = await detectPublicWebNeed(query, { context: { routeIntent: 'general' } });
  if (!need.required) {
    return `query="${query}", required=false, reason=${need.reasonCode || need.reason}`;
  }
  const result = await executePublicWebQuery(query, need);
  assert.notEqual(result.status, 'success', 'low relevance query unexpectedly passed as grounded public web evidence');
  return `query="${query}", status=${result.status}, reason=${result.reasonCode}`;
}

async function assertPublicWebMultiSourceCase(): Promise<string> {
  await assertPublicWebConfigured();
  const query = await requiredSample('XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY');
  const need = await detectPublicWebNeed(query, { context: { routeIntent: 'general' } });
  assert.equal(need.required, true, 'multi-source public query should require public web');
  const result = await executePublicWebQuery(query, need);
  assert.equal(result.status, 'success', `multi-source query failed: ${result.reasonCode}`);
  assert(result.sourceRefs.length >= 2, 'multi-source query should return at least two source refs');
  return `query="${query}", sources=${result.sourceRefs.length}`;
}

async function main(): Promise<void> {
  console.log('validation_mode=strict_real_provider_no_mock_no_fixture_no_random');
  console.log(`sample_file=${runtimeDataPath('real-provider-e2e-samples.json')}`);
  const cases: Array<[string, () => Promise<string | CaseSkip>]> = [
    ['knowledge_hit_api_chat_e2e', assertKnowledgeHitCase],
    ['knowledge_no_hit_api_chat_e2e', assertKnowledgeNoHitCase],
    ['knowledge_stale_api_chat_e2e', assertKnowledgeStaleCase],
    ['public_web_official_source_real_provider', assertPublicWebOfficialCase],
    ['public_web_low_relevance_real_provider', assertPublicWebLowRelevanceCase],
    ['public_web_multi_source_real_provider', assertPublicWebMultiSourceCase],
  ];
  const results: CaseResult[] = [];
  for (const [name, fn] of cases) {
    results.push(await runCase(name, fn));
  }

  for (const result of results) {
    const mark = result.status === 'pass' ? 'PASS' : result.status === 'skip' ? 'SKIP' : 'FAIL';
    console.log(`[${mark}] [${result.evidenceTier}] ${result.name}: ${result.detail}`);
  }

  const failed = results.filter(result => result.status === 'fail');
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
