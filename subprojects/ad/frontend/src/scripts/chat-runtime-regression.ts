import assert from 'node:assert/strict';
import { runChatRuntimeForEvaluation } from '../src/lib/evaluation-runtime-runner';
import { getPublicWebConfig, updatePublicWebConfig } from '../src/lib/runtime-config';
import { callFetchProvider, callSearchProvider, detectPublicWebNeed } from '../src/lib/public-web-runtime';
import { getTraceConfigSync, updateTraceConfig } from '../src/lib/trace-config-store';

process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (message.includes('connect EACCES') || message.includes('CozeLoopTraceExporter') || message.includes('Invalid URL')) {
    console.warn(message);
    return;
  }
  throw error;
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  if (message.includes('connect EACCES') || message.includes('CozeLoopTraceExporter') || message.includes('Invalid URL')) {
    console.warn(message);
    return;
  }
  throw reason;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getContentFromPayload(donePayload: Record<string, unknown> | undefined): string {
  if (!donePayload) return '';
  const result = donePayload.result;
  if (isRecord(result) && typeof result.answer === 'string') return result.answer;
  if (isRecord(result) && typeof result.content === 'string') return result.content;
  if (isRecord(result) && typeof result.message === 'string') return result.message;
  if (isRecord(result) && typeof result.summary === 'string') return result.summary;
  if (typeof donePayload.content === 'string') return donePayload.content;
  return '';
}

function expectedYesterdayDate(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs = 5000): Promise<T | undefined> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeout = setTimeout(() => {
          console.warn(`${label} timed out after ${timeoutMs}ms`);
          resolve(undefined);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function printCase(name: string, result: Awaited<ReturnType<typeof runChatRuntimeForEvaluation>>) {
  const metadata = isRecord(result.done_payload?.metadata) ? result.done_payload?.metadata : {};
  const observation = isRecord(metadata.routing_decision_observation) ? metadata.routing_decision_observation : undefined;
  const runtimeProjection = isRecord(metadata.message_runtime_projection) ? metadata.message_runtime_projection : undefined;
  const responseContract = isRecord(metadata.response_contract) ? metadata.response_contract : undefined;
  const messageContract = isRecord(metadata.message_contract) ? metadata.message_contract : undefined;
  const content = getContentFromPayload(result.done_payload);
  const verbose = process.env.CHAT_RUNTIME_REGRESSION_VERBOSE === '1';
  console.log(`CASE: ${name}`);
  console.log(JSON.stringify({
    answer: result.answer,
    content: content || result.answer,
    serviceIntent: observation && (observation as Record<string, unknown>).actualServiceIntent,
    isReportQuery: observation && (observation as Record<string, unknown>).actualIsReportQuery,
    selectedSkill: runtimeProjection && (runtimeProjection as Record<string, unknown>).selected_skill,
    selectedTool: runtimeProjection && (runtimeProjection as Record<string, unknown>).selected_tool,
    business_outcome: runtimeProjection && (runtimeProjection as Record<string, unknown>).business_outcome,
    tool_execution_status: runtimeProjection && (runtimeProjection as Record<string, unknown>).tool_execution_status,
    answer_origin: responseContract && (responseContract as Record<string, unknown>).answer_origin,
    evidence_mode: responseContract && (responseContract as Record<string, unknown>).evidence_mode,
    source_count: result.sources.length,
    event_types: result.process_events.map(event => event.type),
    ...(verbose ? {
      response_contract: responseContract,
      message_contract: messageContract,
      process_events: result.process_events,
      routing_decision_observation: observation,
    } : {}),
    mainMessage: content || result.answer,
  }, null, 2));
}

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

interface FetchCall {
  url: string;
  init?: FetchInit;
}

function fetchInputToUrl(input: FetchInput): string {
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
    calls.push({ url: fetchInputToUrl(input), init });
    return handler(input, init);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertPublicWebDetectionBoundaries(): Promise<void> {
  const businessQueries = [
    '今天巨量消耗多少',
    '昨天巨量激活多少',
    '查日报',
    '为什么昨天 ROI 下降',
    '获取可用包并发起联调',
  ];
  for (const query of businessQueries) {
    const need = await detectPublicWebNeed(query);
    assert.equal(need.required, false, `${query} must not require public web`);
    assert.notEqual(need.reason, 'realtime_word_only', `${query} must not use realtime-only reason`);
  }

  const privateSystemRecordNeed = await detectPublicWebNeed('今天这个项目的关键数值是多少', {
    context: { hasInternalBusinessSignal: true },
  });
  assert.equal(privateSystemRecordNeed.required, false, 'private system-record facts must not use public web');
  assert.equal(privateSystemRecordNeed.factNeed?.fact_visibility, 'private_enterprise', 'private context must be represented as FactNeed visibility');
  assert.equal(privateSystemRecordNeed.factNeed?.authority_need, 'system_of_record', 'private current values require a system of record');
  assert.equal(privateSystemRecordNeed.searchPlan?.allowed, false, 'public web search plan must block private system-record facts');
  assert.equal(privateSystemRecordNeed.searchPlan?.redaction_policy, 'block', 'private system-record facts must not leak into web search');

  const weatherNeed = await detectPublicWebNeed('下周日南京的天气');
  assert.equal(weatherNeed.required, true, 'weather query should require public web');
  assert(weatherNeed.capabilityType === 'realtime_public_info' || weatherNeed.capabilityType === 'web_search', 'weather query should use public realtime/search capability');
  assert.equal(weatherNeed.providerEligibility?.eligible, true, 'public realtime facts should pass provider eligibility');
  assert.equal(weatherNeed.searchPlan?.allowed, true, 'public realtime facts should build an allowed search plan');

  const policyNeed = await detectPublicWebNeed('查一下巨量引擎官网最新政策');
  assert.equal(policyNeed.required, true, 'official policy query should require public web');
  assert.equal(policyNeed.sourceRequired, true, 'official policy query should require sources');
  assert.equal(policyNeed.factNeed?.fact_visibility, 'public', 'official public facts should be public visibility');
  assert(
    policyNeed.searchPlan?.source_policy === 'official_first' || policyNeed.searchPlan?.source_policy === 'official_required',
    'official public facts should prefer official sources',
  );

  assert.equal((await detectPublicWebNeed('网上搜一下腾讯广告小游戏审核规则')).required, true, 'explicit web search should require public web');
  assert.equal((await detectPublicWebNeed('今天是法定节假日吗')).required, true, 'holiday public info should require public web');
  const consensusNeed = await detectPublicWebNeed('最近游戏买量行业有什么新闻');
  assert.equal(consensusNeed.required, true, 'industry news should require public web');
  assert.equal(consensusNeed.searchPlan?.allowed, true, 'public trend facts should allow web search');
  assert(
    consensusNeed.searchPlan?.depth === 'deep' || consensusNeed.searchPlan?.source_policy === 'multi_source_consensus',
    'trend or consensus facts should request deeper public evidence',
  );
}

async function assertPublicWebEndpointSelection(originalConfig: Awaited<ReturnType<typeof getPublicWebConfig>>): Promise<void> {
  const searchEndpoint = 'https://search.test.local/query';
  const fetchEndpoint = 'https://fetch.test.local/page';
  await withMockedFetch(
    () => new Response(JSON.stringify({
      results: [
        {
          title: 'Public Search Result',
          url: 'https://source.test.local/item',
          snippet: 'public source',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    async (calls) => {
      await callSearchProvider({
        query: '现在北京天气如何',
        maxResults: 3,
      }, {
        ...originalConfig,
        enabled: true,
        searchEndpoint,
        fetchEndpoint,
        method: 'GET',
      });
      assert.equal(calls.length, 1, 'search should issue one provider request');
      assert(calls[0].url.startsWith(searchEndpoint), 'search must call searchEndpoint');
      assert(!calls[0].url.startsWith(fetchEndpoint), 'search must not call fetchEndpoint');
    },
  );

  await withMockedFetch(
    () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    async (calls) => {
      await callFetchProvider({
        url: 'https://source.test.local/item',
        extractText: true,
      }, {
        ...originalConfig,
        enabled: true,
        searchEndpoint,
        fetchEndpoint,
      });
      assert.equal(calls.length, 1, 'fetch should issue one provider request');
      assert.equal(calls[0].url, fetchEndpoint, 'fetch must call fetchEndpoint');
    },
  );

  await withMockedFetch(
    () => new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    async (calls) => {
      await assert.rejects(
        () => callSearchProvider({ query: '现在北京天气如何' }, {
          ...originalConfig,
          enabled: true,
          searchEndpoint: '',
          fetchEndpoint,
        }),
        /search_endpoint_missing/,
      );
      assert.equal(calls.length, 0, 'search without searchEndpoint must not call fetchEndpoint');
    },
  );
}

async function main(): Promise<void> {
  const originalPublicWebConfig = await getPublicWebConfig();
  const originalTraceConfig = getTraceConfigSync();
  await updatePublicWebConfig({
    ...originalPublicWebConfig,
    enabled: false,
    searchEndpoint: '',
  });
  // Model service stays enabled — IntentOrch, entity_candidate_extraction
  // and other LLM-assisted steps need it for the full architecture flow.
  await updateTraceConfig({
    ...originalTraceConfig,
    enabled: false,
  });
  try {
  await assertPublicWebDetectionBoundaries();
  await assertPublicWebEndpointSelection(originalPublicWebConfig);
  const hello = await runChatRuntimeForEvaluation({ message: '你好', scenario: 'general_chat' });
  printCase('你好', hello);
  const helloMetadata = isRecord(hello.done_payload?.metadata) ? hello.done_payload.metadata : {};
  const helloObservation = isRecord(helloMetadata.routing_decision_observation) ? helloMetadata.routing_decision_observation : {};
  const helloResponseContract = isRecord(helloMetadata.response_contract) ? helloMetadata.response_contract : {};
  const helloAnswerOrigin = isRecord(helloResponseContract.answer_origin) ? helloResponseContract.answer_origin : {};
  const helloText = hello.answer + getContentFromPayload(hello.done_payload);
  assert.equal(isRecord(helloObservation.actualExecution) ? helloObservation.actualExecution.actualServiceIntent : helloObservation.serviceIntent, 'general_chat', 'hello must stay general_chat');
  assert.equal(isRecord(helloObservation.actualExecution) ? helloObservation.actualExecution.actualIsReportQuery : helloObservation.isReportQuery, false, 'hello must not enter report query');
  assert(
    helloAnswerOrigin.source === 'real_llm'
      || helloAnswerOrigin.source === 'model_unavailable'
      || helloAnswerOrigin.source === 'template_composer',
    'hello must either use real LLM or a governed local/model-unavailable fallback',
  );
  if (helloAnswerOrigin.source === 'real_llm') {
    assert(typeof helloAnswerOrigin.model_name === 'string' && helloAnswerOrigin.model_name.length > 0, 'hello must include modelName');
  }
  assert(!/问数链路|summary|query_contract|slot_validation|查询目标/.test(helloText), 'general chat must not leak report/internal fallback');

  const noWeb = await runChatRuntimeForEvaluation({ message: '下周日南京的天气', scenario: 'general_chat' });
  printCase('下周日南京的天气 - no web capability', noWeb);
  const noWebText = noWeb.answer + getContentFromPayload(noWeb.done_payload);
  assert(/天气是公开可查的信息|天气.*公开|实时.*天气|查天气|天气查询/.test(noWebText), 'weather answer must acknowledge public weather can be checked');
  assert(/实时天气来源|实时来源|实时.*信息|无法.*实时|不能.*实时|无法直接/.test(noWebText), 'weather answer must explain the realtime source requirement');
  assert(/没有返回可验证结果|没有取得可验证|无法.*结果|未能.*确认|没有.*数据|无法获取/.test(noWebText), 'weather answer must explain no reliable realtime result was obtained');
  assert(/不足以确认|无法确认|无法提供|未能确认|暂无|不确定/.test(noWebText), 'weather answer must avoid fabricating an unsupported result');
  assert(!/preferred_capability_not_executable|source_count=0|请补齐查询条件|未配置公共网页能力|外部检索/.test(noWebText), 'web unavailable answer must not leak internal capability enums or config wording');
  assert.equal(noWeb.sources.length, 0, 'web unavailable case must not fabricate sourceRefs');
  assert.equal((await detectPublicWebNeed('查官网公告')).required, true, 'external public info without realtime cue should still trigger web');

  await updatePublicWebConfig({
    ...originalPublicWebConfig,
    enabled: true,
    searchEndpoint: 'fake:public-web',
    providerLabel: 'Fake Public Web',
    method: 'GET',
    maxResults: 3,
    allowedDomains: [],
    blockedDomains: [],
    internalDataProtection: true,
    sourceRequired: true,
  });
  const sanitizedPublicWebConfig = await getPublicWebConfig();
  assert.equal(sanitizedPublicWebConfig.searchEndpoint, '', 'unsafe public web endpoint must be cleared during normalization');
  const withWeb = await runChatRuntimeForEvaluation({ message: '下周日南京的天气', scenario: 'general_chat' });
  printCase('下周日南京的天气 - unsafe web endpoint', withWeb);
  const withWebMetadata = isRecord(withWeb.done_payload?.metadata) ? withWeb.done_payload.metadata : {};
  const withWebResponseContract = isRecord(withWebMetadata.response_contract) ? withWebMetadata.response_contract : {};
  const withWebText = withWeb.answer + getContentFromPayload(withWeb.done_payload);
  const withWebSourceText = JSON.stringify({
    sources: withWeb.sources,
    sourceRefs: withWebResponseContract.source_refs,
  });
  assert(!/fake:public-web|\/api\/xiaoqiao\/web-search/.test(withWebSourceText), 'unsafe public web endpoint must not be used as a source');
  assert(
    /天气是公开可查的信息|实时天气来源|不足以确认|目标日期|无法获取|无法确认|暂时无法|没有可靠|无法提供.*天气|实时.*来源.*不可用|未能.*确认/.test(withWebText),
    'unsafe public web endpoint must either use weather provider evidence or refuse without fabricating weather',
  );
  assert(!/北京天气公开来源|weather\.example\.test|example\.test/.test(withWebText), 'unsafe public web endpoint must not expose synthetic source text');

  const helpWeather = await runChatRuntimeForEvaluation({ message: '天气接口怎么配置', scenario: 'general_chat' });
  printCase('天气接口怎么配置', helpWeather);
  const helpWeatherMetadata = isRecord(helpWeather.done_payload?.metadata) ? helpWeather.done_payload.metadata : {};
  const helpWeatherResponseContract = isRecord(helpWeatherMetadata.response_contract) ? helpWeatherMetadata.response_contract : {};
  const helpWeatherPublicWeb = isRecord(helpWeatherResponseContract.metadata) ? helpWeatherResponseContract.metadata.public_web : undefined;
  assert.equal(helpWeatherPublicWeb, undefined, 'weather configuration help must not trigger realtime public web search');

  const blockedWeb = await runChatRuntimeForEvaluation({ message: '搜索 appId 10100001 的昨天成本和 ROI', scenario: 'general_chat' });
  printCase('搜索 appId 10100001 的昨天成本和 ROI', blockedWeb);
  const blockedMetadata = isRecord(blockedWeb.done_payload?.metadata) ? blockedWeb.done_payload.metadata : {};
  const blockedObservation = isRecord(blockedMetadata.routing_decision_observation) ? blockedMetadata.routing_decision_observation : {};
  const blockedResponseContract = isRecord(blockedMetadata.response_contract) ? blockedMetadata.response_contract : {};
  const blockedRuntimeProjection = isRecord(blockedMetadata.message_runtime_projection) ? blockedMetadata.message_runtime_projection : {};
  const blockedSourceRefs = Array.isArray(blockedResponseContract.source_refs) ? blockedResponseContract.source_refs : [];
  const blockedExternalSourceRefs = blockedSourceRefs.filter((source) => (
    isRecord(source)
    && typeof source.url === 'string'
    && /^https?:\/\//i.test(source.url)
  ));
  const blockedUsedInternalTool = (
    (isRecord(blockedObservation.actualExecution) ? blockedObservation.actualExecution.actualServiceIntent : blockedObservation.serviceIntent) === 'data_query'
    || (isRecord(blockedObservation.actualExecution) ? blockedObservation.actualExecution.actualServiceIntent : blockedObservation.serviceIntent) === 'report_query'
    || isRecord(blockedMetadata.report_query_result)
    || typeof blockedRuntimeProjection.selected_tool === 'string'
  );
  const blockedText = blockedWeb.answer + getContentFromPayload(blockedWeb.done_payload);
  const blockedRefusedWithoutFabrication = /当前未接入联网查询能力|无法获取|未配置公共网页能力，当前无法直接外部检索|需要登录后才能查询内部报表数据|当前候选工具还不能直接完成这次查询|已整理能力缺口/.test(blockedText);
  assert(
    blockedUsedInternalTool || blockedRefusedWithoutFabrication,
    'internal data query must be answered by internal tools or refuse without public-web fabrication',
  );
  assert.equal(blockedWeb.sources.length, 0, 'internal data query must not attach public web sources');
  assert.equal(blockedExternalSourceRefs.length, 0, 'internal data query response contract must not attach public web URLs');

  await updatePublicWebConfig({
    ...originalPublicWebConfig,
    enabled: false,
    searchEndpoint: '',
  });

  const report = await runChatRuntimeForEvaluation({
    message: '昨天巨量激活多少',
    scenario: 'data_query',
    metadata: {
      currentProject: {
        appId: 'app-demo',
        appName: '示例应用',
        projectId: 'project-demo',
        projectName: '示例项目',
      },
    },
  });
  printCase('昨天巨量激活多少', report);
  const reportMetadata = isRecord(report.done_payload?.metadata) ? report.done_payload.metadata : {};
  const reportResult = isRecord(reportMetadata.report_query_result) ? reportMetadata.report_query_result : {};
  const reportDateRange = isRecord(reportResult.date_range) ? reportResult.date_range : {};
  const reportText = report.answer + getContentFromPayload(report.done_payload);
  assert.equal(reportDateRange.start_date, reportDateRange.end_date, 'yesterday should resolve to a single-day date range');
  assert(!/时间范围 未识别|查询目标|summary|query_contract|slot_validation|已识别到查询条件|app-demo|project-demo/.test(reportText), 'report main message must not leak internal fields');

  const cost = await runChatRuntimeForEvaluation({
    message: '巨量昨天消耗的多少',
    scenario: 'data_query',
    metadata: {
      currentProject: {
        appId: '10100001',
        appName: '当前项目',
        projectId: 'project-demo',
        projectName: '当前项目',
      },
    },
  });
  printCase('巨量昨天消耗的多少', cost);
  const costMetadata = isRecord(cost.done_payload?.metadata) ? cost.done_payload.metadata : {};
  const costResult = isRecord(costMetadata.report_query_result) ? costMetadata.report_query_result : {};
  const costDateRange = isRecord(costResult.date_range) ? costResult.date_range : {};
  const costInput = isRecord(costResult.input) ? costResult.input : {};
  const costRows = Array.isArray(costResult.rows) ? costResult.rows.filter(isRecord) : [];
  const firstCostRow = costRows[0] || {};
  const expectedCostAmount = Number(firstCostRow.cost_amount ?? firstCostRow.cost ?? firstCostRow.spend);
  const expectedCostText = Number.isFinite(expectedCostAmount)
    ? expectedCostAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  const costText = cost.answer || getContentFromPayload(cost.done_payload);
  const costMediaInput = [costInput.media_id, costInput.mediaId, costInput.mediaIds]
    .flatMap(item => Array.isArray(item) ? item : item ? [item] : [])
    .map(String);
  assert.equal(costDateRange.start_date, costDateRange.end_date, 'cost query should resolve yesterday to a single-day date range');
  assert(costMediaInput.includes('10001'), 'cost query should resolve exact media dictionary match into final tool media argument');
  assert(!/查询目标|输出维度|筛选条件|已处理\s*\d+\s*步|检查数据能力配置|切换到可用视图|summary|query_contract|slot_validation|appId|projectId|10100001/.test(costText), 'cost query main message must not leak process or internal fields');
  assert(!/时间范围 未识别/.test(costText), 'cost query must not report missing time range');
  assert(!/媒体平台.*确认|确认媒体平台|缺少媒体平台/.test(costText), 'cost query should not ask for media platform when exact media dictionary match resolves');
  assert(costText.includes(expectedYesterdayDate()), 'cost query main message should include resolved date');
  assert(/巨量/.test(costText), 'cost query main message should include media');
  assert(expectedCostText ? costText.includes(expectedCostText) : /\d[\d,]*\.\d{2}/.test(costText), 'cost query main message should include cost amount');
  assert(/元/.test(costText), 'cost query main message should include currency unit');
  assert(!/^已查到.+共\s*1\s*条数据(?:。)?$/.test(costText.trim()), 'cost query main message must not be row-count-only');
  assert(!/\|\s*(date|dt|media_id|cost_amount)\s*\|/i.test(costText), 'cost query main message must not render raw-key table headers');

  const daily = await runChatRuntimeForEvaluation({ message: '查日报', scenario: 'general_chat' });
  printCase('查日报', daily);
  const dailyMetadata = isRecord(daily.done_payload?.metadata) ? daily.done_payload.metadata : {};
  const dailyObservation = isRecord(dailyMetadata.routing_decision_observation) ? dailyMetadata.routing_decision_observation : {};
  const dailyCapability = isRecord(dailyObservation.capabilityDecision) ? dailyObservation.capabilityDecision : {};
  const dailyText = daily.answer || getContentFromPayload(daily.done_payload);
  assert.equal(isRecord(dailyObservation.actualExecution) ? dailyObservation.actualExecution.actualIsReportQuery : dailyObservation.isReportQuery, true, 'daily report should enter report query through capability evidence');
  assert(isRecord(dailyCapability.executable) || Array.isArray(dailyCapability.candidates), 'daily report should expose capability discovery evidence');
  assert(!/metric|指标/.test(dailyText), 'daily report should not mechanically ask for metric');
  assert(!/appId|projectId|summary|query_contract|slot_validation/.test(dailyText), 'daily report main message must not leak internal fields');

  const diagnosis = await runChatRuntimeForEvaluation({ message: '为什么昨天 ROI 下降', scenario: 'general_chat' });
  printCase('为什么昨天 ROI 下降', diagnosis);
  const diagnosisMetadata = isRecord(diagnosis.done_payload?.metadata) ? diagnosis.done_payload.metadata : {};
  const diagnosisObservation = isRecord(diagnosisMetadata.routing_decision_observation) ? diagnosisMetadata.routing_decision_observation : {};
  const diagnosisOrigin = isRecord(diagnosisMetadata.response_contract) && isRecord(diagnosisMetadata.response_contract.answer_origin)
    ? diagnosisMetadata.response_contract.answer_origin
    : {};
  assert.equal(isRecord(diagnosisObservation.actualExecution) ? diagnosisObservation.actualExecution.actualServiceIntent : diagnosisObservation.serviceIntent, 'issue_diagnosis', 'ROI diagnosis must stay on diagnosis intent');
  assert.notEqual(diagnosisOrigin.composer_name, 'chat_answer', 'diagnosis must not be answered directly by chat_answer');

  const operation = await runChatRuntimeForEvaluation({ message: '获取可用包并发起联调', scenario: 'general_chat' });
  printCase('获取可用包并发起联调', operation);
  const operationMetadata = isRecord(operation.done_payload?.metadata) ? operation.done_payload.metadata : {};
  const operationObservation = isRecord(operationMetadata.routing_decision_observation) ? operationMetadata.routing_decision_observation : {};
  const operationOrigin = isRecord(operationMetadata.response_contract) && isRecord(operationMetadata.response_contract.answer_origin)
    ? operationMetadata.response_contract.answer_origin
    : {};
  assert.equal(isRecord(operationObservation.actualExecution) ? operationObservation.actualExecution.actualServiceIntent : operationObservation.serviceIntent, 'system_operation', 'operation request must stay system_operation');
  assert.notEqual(operationOrigin.composer_name, 'chat_answer', 'operation must not be answered directly by chat_answer');
  } finally {
    await withTimeout('restore public web config', updatePublicWebConfig(originalPublicWebConfig));
    await withTimeout('restore trace config', updateTraceConfig(originalTraceConfig));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
