import { getPublicWebConfig } from '../src/lib/runtime-config';
import { callSearchProvider, detectPublicWebNeed, executePublicWebQuery } from '../src/lib/public-web-runtime';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split('.').filter(Boolean).reduce((current, key) => {
    if (Array.isArray(current)) return current[Number(key)];
    if (isRecord(current)) return current[key];
    return undefined;
  }, value);
}

function findArrayCandidate(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const candidates = [value.results, value.items, value.data, value.list, value.webPages, value.organic_results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = findArrayCandidate(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

function summarizeRawItem(item: unknown, config: Awaited<ReturnType<typeof getPublicWebConfig>>): Record<string, unknown> {
  const record = isRecord(item) ? item : {};
  return {
    keys: Object.keys(record).slice(0, 12),
    title: String(readPath(record, config.titlePath) || record.name || record.title || '').slice(0, 120),
    url: String(readPath(record, config.urlPath) || record.link || record.url || '').slice(0, 180),
    snippet: String(readPath(record, config.snippetPath) || record.description || record.snippet || record.content || '').slice(0, 180),
  };
}

async function debugQuery(query: string): Promise<void> {
  const config = await getPublicWebConfig();
  console.log(`\nQUERY ${JSON.stringify(query)}`);
  const need = await detectPublicWebNeed(query, { context: { routeIntent: 'general' } });
  console.log(JSON.stringify({
    need_required: need.required,
    reasonCode: need.reasonCode,
    capabilityType: need.capabilityType,
    factNeed: need.factNeed,
    searchPlan: need.searchPlan,
  }, null, 2));

  try {
    const direct = await callSearchProvider({
      query,
      locale: 'zh-CN',
      freshness: need.realtime ? 'realtime' : 'recent',
      maxResults: config.maxResults,
      allowedDomains: config.allowedDomains,
      blockedDomains: config.blockedDomains,
    }, config);
    const rawItems = config.resultsPath ? readPath(direct, config.resultsPath) : findArrayCandidate(direct);
    const list = Array.isArray(rawItems) ? rawItems : findArrayCandidate(rawItems);
    console.log(JSON.stringify({
      direct_provider_top_keys: isRecord(direct) ? Object.keys(direct).slice(0, 16) : [],
      direct_result_count: list.length,
      direct_first_items: list.slice(0, 3).map(item => summarizeRawItem(item, config)),
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      direct_provider_error: error instanceof Error ? error.message : String(error),
    }, null, 2));
  }

  const result = await executePublicWebQuery(query, need);
  console.log(JSON.stringify({
    execute_status: result.status,
    reasonCode: result.reasonCode,
    sanitizedQuery: result.sanitizedQuery,
    source_count: result.sourceRefs.length,
    warnings: result.warnings,
    event_outputs: result.processEvents.map(event => ({
      type: event.type,
      status: event.status,
      summary: event.summary,
      output: event.output,
    })),
    sources: result.sourceRefs.map(source => ({
      title: source.title,
      url: source.url,
      source: source.source,
      snippet: source.snippet,
    })),
  }, null, 2));
}

async function main(): Promise<void> {
  const config = await getPublicWebConfig();
  console.log(JSON.stringify({
    validation_mode: 'real_public_web_debug_no_mock',
    provider_enabled: config.enabled,
    endpoint_set: Boolean(config.searchEndpoint),
    providerLabel: config.providerLabel,
    method: config.method,
    maxResults: config.maxResults,
    resultsPath: config.resultsPath,
    titlePath: config.titlePath,
    urlPath: config.urlPath,
    snippetPath: config.snippetPath,
  }, null, 2));

  const base = process.env.XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY?.trim() || '乌克兰是否真要和俄罗斯停火';
  const queries = [
    base,
    '乌克兰 俄罗斯 停火 最新 消息',
    '乌克兰 俄罗斯 停火 谈判 官方 最新',
    'Ukraine Russia ceasefire latest official talks',
    'Ukraine Russia ceasefire Reuters AP latest',
  ];
  for (const query of queries) {
    await debugQuery(query);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
