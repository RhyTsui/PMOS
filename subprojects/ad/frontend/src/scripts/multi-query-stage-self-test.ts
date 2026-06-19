import assert from 'node:assert/strict';
import { shouldEnterMultiQueryStage } from '../src/lib/chat-pipeline/multi-query-stage';
import type { ChatPipelineContext } from '../src/lib/chat-pipeline/pipeline-types';
import type { McpServerConfig, McpToolConfig } from '../src/types';

// ─── Helper Functions ─────────────────────────────────────

function tool(
  name: string,
  description: string,
  schemaProperties: Record<string, unknown> = {},
): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      properties: schemaProperties,
      required: Object.keys(schemaProperties),
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  } as McpToolConfig;
}

function server(tools: McpToolConfig[]): McpServerConfig[] {
  return [
    {
      id: 'test-server',
      name: 'Test Server',
      description: 'Test MCP Server',
      category: 'data',
      endpoint_url: 'https://test-mcp.example.local/mcp',
      transport: 'streamable-http',
      auth_type: 'bearer_token',
      auth_config: {},
      status: 'connected',
      enabled: true,
      business_domains: ['ad-report'],
      bound_agents: ['ad-assistant'],
      tags: ['report'],
      tools,
      resources: [],
      prompts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

function createContext(
  isReportQuery: boolean,
  metrics: string[],
  dimensions: string[] = [],
): ChatPipelineContext {
  return {
    isReportQuery,
    userRequirement: {
      metrics,
      dimensions: dimensions.map(key => ({ key, role: 'breakdown' as const })),
      dateRange: { type: 'recent', value: '7d' },
      filters: {},
    },
  } as ChatPipelineContext;
}

// ─── Test Cases ───────────────────────────────────────────

function testNotReportQuery(): void {
  const ctx = createContext(false, ['cost', 'roi']);
  const servers = server([]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    false,
    'should return false when not a report query',
  );
}

function testLessThanTwoMetricsOrDimensions(): void {
  const ctx = createContext(true, ['cost']); // Only 1 metric
  const servers = server([]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    false,
    'should return false when less than 2 metrics or dimensions',
  );
}

function testSingleToolCanSatisfyAllMetrics(): void {
  // 场景：查看消耗和 ROI，单个工具同时支持 daily 和 roi domains
  // 使用一个通用的报表工具，通过描述来表明它支持多个指标
  const ctx = createContext(true, ['cost', 'roi']);
  const servers = server([
    tool(
      'get_comprehensive_metrics_report',
      'Comprehensive report providing cost, activation, roi and other metrics with daily granularity',
      { date: { type: 'string' } },
    ),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    false,
    'should return false when single tool can satisfy all metrics',
  );
}

function testNoSingleToolCanSatisfyAllMetrics(): void {
  // 场景：查看消耗、ROI、次留，没有单个工具支持所有 domains
  const ctx = createContext(true, ['cost', 'roi', 'retention_d1']);
  const servers = server([
    tool(
      'get_zt_ad_day_report',
      'Daily report tool - provides cost and activation metrics',
      { date: { type: 'string' } },
    ),
    tool(
      'get_zt_ad_retention_report',
      'Retention report tool - provides retention metrics',
      { date: { type: 'string' } },
    ),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    true,
    'should return true when no single tool can satisfy all metrics',
  );
}

function testSingleToolSupportsAllDimensions(): void {
  // 场景：需要多个维度，但单个工具支持所有维度和指标
  // 工具需要同时支持 daily 和 roi domains，以及所有请求的维度
  // 使用一个通用的工具名称，让它通过描述来推断多个 domains
  const ctx = createContext(true, ['cost', 'roi'], ['date', 'media_id']);
  const servers = server([
    tool(
      'get_comprehensive_ad_report',
      'Comprehensive advertising report with daily, weekly, monthly granularity and ROI metrics. Supports all dimensions including media_id, account_id. Provides cost, activation, roi and other metrics.',
      { date: { type: 'string' }, media_id: { type: 'string' }, account_id: { type: 'string' } },
    ),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    false,
    'should return false when single tool supports all dimensions and metrics',
  );
}

function testNoToolSupportsAllDimensions(): void {
  // 场景：需要多个维度，但没有单个工具支持所有维度
  const ctx = createContext(true, ['cost', 'roi'], ['date', 'media', 'account']);
  const servers = server([
    tool(
      'get_report_1',
      'Report tool with media dimension',
      { date: { type: 'string' }, media_id: { type: 'string' } },
    ),
    tool(
      'get_report_2',
      'Report tool with account dimension',
      { date: { type: 'string' }, account_id: { type: 'string' } },
    ),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    true,
    'should return true when no tool supports all dimensions',
  );
}

function testComplexScenarioWithMixedCapabilities(): void {
  // 复杂场景：多个工具，部分覆盖
  const ctx = createContext(true, ['cost', 'activation', 'roi', 'retention_d1']);
  const servers = server([
    tool('get_daily_report', 'Daily report for cost and activation', { date: { type: 'string' } }),
    tool('get_roi_report', 'ROI report tool', { date: { type: 'string' } }),
    tool('get_retention_report', 'Retention report tool', { date: { type: 'string' } }),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    true,
    'should return true in complex scenario with no single tool covering all metrics',
  );
}

function testSingleToolCoversEverythingInComplexScenario(): void {
  // 即使有多个工具，但有一个工具能覆盖所有需求
  const ctx = createContext(true, ['cost', 'roi'], ['date']);
  const servers = server([
    tool('get_limited_report', 'Limited daily report', { date: { type: 'string' } }),
    tool(
      'get_full_advertising_report',
      'Full advertising report with daily and roi metrics. Provides cost, activation, roi and other metrics with date dimension.',
      { date: { type: 'string' } },
    ),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    false,
    'should return false when comprehensive tool covers everything',
  );
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Running multi-query-stage self-test...\n');

  try {
    testNotReportQuery();
    console.log('✓ testNotReportQuery passed');

    testLessThanTwoMetricsOrDimensions();
    console.log('✓ testLessThanTwoMetricsOrDimensions passed');

    testSingleToolCanSatisfyAllMetrics();
    console.log('✓ testSingleToolCanSatisfyAllMetrics passed');

    testNoSingleToolCanSatisfyAllMetrics();
    console.log('✓ testNoSingleToolCanSatisfyAllMetrics passed');

    testSingleToolSupportsAllDimensions();
    console.log('✓ testSingleToolSupportsAllDimensions passed');

    testNoToolSupportsAllDimensions();
    console.log('✓ testNoToolSupportsAllDimensions passed');

    testComplexScenarioWithMixedCapabilities();
    console.log('✓ testComplexScenarioWithMixedCapabilities passed');

    testSingleToolCoversEverythingInComplexScenario();
    console.log('✓ testSingleToolCoversEverythingInComplexScenario passed');

    console.log('\n✅ All multi-query-stage self-test cases passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
