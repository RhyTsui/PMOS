import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPublicWebConfig, updatePublicWebConfig } from '../src/lib/runtime-config';
import { detectPublicWebNeed, executePublicWebQuery } from '../src/lib/public-web-runtime';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

interface FetchCall {
  url: string;
  init?: FetchInit;
}

function inputToUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function withMockedFetch<T>(
  handler: (input: FetchInput, init?: FetchInit) => Promise<Response> | Response,
  run: (calls: FetchCall[]) => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => {
    calls.push({ url: inputToUrl(input), init });
    return handler(input, init);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function assertCoreDoesNotContainAcceptanceScenarios(): void {
  const bannedTokens = ['赛程', '世界杯', '选举', '高考', '商城', '腾讯广告', '巨量', '巨量引擎'];
  const coreFiles = [
    'src/contracts/request-understanding/fact-need-contract.ts',
    'src/lib/fact-need-reasoner.ts',
    'src/lib/public-web-runtime.ts',
    'src/app/api/chat/route.ts',
  ];
  for (const file of coreFiles) {
    const content = readFileSync(join(process.cwd(), file), 'utf8');
    for (const token of bannedTokens) {
      assert(!content.includes(token), `${file} must not contain acceptance scenario token: ${token}`);
    }
  }
}

async function assertFactNeedBoundaries(): Promise<void> {
  const privateNeed = await detectPublicWebNeed('今天这个项目的关键数值是多少', {
    context: { hasInternalBusinessSignal: true },
  });
  assert.equal(privateNeed.required, false, 'private enterprise facts must not require public web');
  assert.equal(privateNeed.factNeed?.fact_visibility, 'private_enterprise');
  assert.equal(privateNeed.factNeed?.authority_need, 'system_of_record');
  assert.equal(privateNeed.factNeed?.sensitivity, 'business_context');
  assert.equal(privateNeed.providerEligibility?.eligible, false);
  assert.equal(privateNeed.searchPlan?.allowed, false);
  assert.equal(privateNeed.searchPlan?.redaction_policy, 'block');

  const unknownSystemRecordNeed = await detectPublicWebNeed('昨天这个对象的关键数值是多少');
  assert.equal(unknownSystemRecordNeed.required, false, 'unknown fresh system-record values must not default to public web');
  assert.equal(unknownSystemRecordNeed.factNeed?.authority_need, 'system_of_record');
  assert.equal(unknownSystemRecordNeed.ambiguity?.[0]?.resolution, 'ask_user');

  const publicOfficialNeed = await detectPublicWebNeed('查官网公告');
  assert.equal(publicOfficialNeed.required, true, 'official public facts should require public web evidence');
  assert.equal(publicOfficialNeed.factNeed?.fact_visibility, 'public');
  assert.equal(publicOfficialNeed.factNeed?.authority_need, 'official_source');
  assert.equal(publicOfficialNeed.providerEligibility?.eligible, true);
  assert.equal(publicOfficialNeed.searchPlan?.allowed, true);
  assert(
    publicOfficialNeed.searchPlan?.source_policy === 'official_first'
      || publicOfficialNeed.searchPlan?.source_policy === 'official_required',
    'official public facts should prefer official sources',
  );

  const consensusNeed = await detectPublicWebNeed('最近行业有什么新闻');
  assert.equal(consensusNeed.required, true, 'fresh public synthesis should require public web');
  assert.equal(consensusNeed.factNeed?.authority_need, 'multi_source_consensus');
  assert.equal(consensusNeed.searchPlan?.depth, 'deep');
  assert.equal(consensusNeed.searchPlan?.source_policy, 'multi_source_consensus');
}

async function assertMockedPublicWebExecution(): Promise<void> {
  const originalConfig = await getPublicWebConfig();
  await updatePublicWebConfig({
    ...originalConfig,
    enabled: true,
    searchEndpoint: 'https://search.acceptance.local/query',
    fetchEndpoint: '',
    method: 'GET',
    providerLabel: 'Acceptance Public Web',
    maxResults: 3,
    providers: [],
    allowedDomains: [],
    blockedDomains: [],
    internalDataProtection: true,
    sourceRequired: true,
  });

  try {
    const need = await detectPublicWebNeed('查官网公告');
    assert.equal(need.required, true);
    await withMockedFetch(
      () => new Response(JSON.stringify({
        results: [
          {
            title: '官网公告 official',
            url: 'https://official-source.acceptance.local/notices',
            snippet: '官网公告 official 已发布公开信息。',
            siteName: 'official-source.acceptance.local',
          },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      async (calls) => {
        const result = await executePublicWebQuery('查官网公告', need);
        const searchEndpointCalls = calls.filter(call => call.url.startsWith('https://search.acceptance.local/query'));
        assert(searchEndpointCalls.length > 0, 'public web execution must call the configured search endpoint');
        assert.equal(result.status, 'success');
        assert(result.sourceRefs.length > 0, 'successful public web execution must attach source refs');
        assert(result.processEvents.some(event => event.type === 'web.search'), 'trace must contain web.search');
        assert(result.processEvents.some(event => event.type === 'web.result'), 'trace must contain web.result');
        const searchEvent = result.processEvents.find(event => event.type === 'web.search');
        assert(searchEvent && typeof searchEvent.output === 'object', 'web.search must expose trace output');
        const output = searchEvent.output as Record<string, unknown>;
        assert(output.fact_need, 'web.search output must include fact_need');
        assert(output.provider_eligibility, 'web.search output must include provider_eligibility');
        assert(output.search_plan, 'web.search output must include search_plan');
      },
    );
  } finally {
    await updatePublicWebConfig(originalConfig);
  }
}

async function main(): Promise<void> {
  assertCoreDoesNotContainAcceptanceScenarios();
  await assertFactNeedBoundaries();
  await assertMockedPublicWebExecution();
  console.log('fact need public web acceptance passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
