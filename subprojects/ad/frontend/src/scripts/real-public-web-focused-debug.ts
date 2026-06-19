import { detectPublicWebNeed, executePublicWebQuery } from '../src/lib/public-web-runtime';

const queries = [
  process.env.XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY?.trim() || '乌克兰是否真要和俄罗斯停火',
  process.env.XIAOQIAO_REAL_WEB_MULTI_SOURCE_CONTROL_QUERY?.trim() || 'Ukraine Russia ceasefire Reuters AP latest',
];

async function main(): Promise<void> {
  for (const query of queries) {
    const need = await detectPublicWebNeed(query, { context: { routeIntent: 'general' } });
    const result = await executePublicWebQuery(query, need);
    console.log(JSON.stringify({
      validation_mode: 'real_public_web_focused_debug_no_mock',
      query,
      factNeed: need.factNeed,
      searchPlan: need.searchPlan,
      status: result.status,
      reasonCode: result.reasonCode,
      sanitizedQuery: result.sanitizedQuery,
      source_count: result.sourceRefs.length,
      warnings: result.warnings,
      events: result.processEvents.map(event => ({
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
