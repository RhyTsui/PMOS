import assert from 'node:assert/strict';
import { shouldEnterMultiQueryStage } from '../src/lib/chat-pipeline/multi-query-stage';
import { buildMcpToolArgs } from '../src/lib/multi-tool-orchestrator';
import { decomposeQuery, extractDimensionKeysFromText, extractMetricKeysFromText } from '../src/lib/query-decomposer';
import { buildReportCapabilityManifest } from '../src/lib/report-capability-manifest';
import { buildReportToolInput } from '../src/lib/report-query-orchestrator';
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
  message = '',
): ChatPipelineContext {
  return {
    isReportQuery,
    message,
    question: message,
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

function testMig050TextTriggersMultiQuery(): void {
  const message = '指间2026-01-01 IOS应用类型+巨量+广告投放部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数 分别是多少';
  assert.deepEqual(extractDimensionKeysFromText(message), [], 'MIG-050 filters should not become breakdown dimensions');
  const ctx = createContext(true, [], [], message);
  const servers = server([
    tool('get_zt_ad_day_report', 'Daily ad report with activation and paid account metrics', { startDate: { type: 'string' }, endDate: { type: 'string' } }),
    tool('get_zt_ad_roi_report', 'ROI report for cumulative ROI and day ROI', { startDate: { type: 'string' }, endDate: { type: 'string' } }),
    tool('get_zt_ad_retention_report', 'Retention report supports device retention, register retention and paid retention', { startDate: { type: 'string' }, endDate: { type: 'string' }, retentionType: { type: 'string' } }),
    tool('get_zt_hour_report', 'Hour report for time slot metrics', { startDate: { type: 'string' }, endDate: { type: 'string' }, hour: { type: 'string' } }),
  ]);
  assert.equal(
    shouldEnterMultiQueryStage(ctx, servers),
    true,
    'MIG-050-style text should enter multi-query even when userRequirement metrics are sparse',
  );
}

function testMig050SubQueriesBuildSchemaArgs(): void {
  const message = '指间2026-01-01 IOS应用类型+巨量+广告投放部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数 分别是多少';
  const schemaBase = {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
    appPackageType: { type: 'array', items: { type: 'string' } },
    mediaId: { type: 'array', items: { type: 'string' } },
    teamIds: { type: 'array', items: { type: 'string' } },
    subGroup: { type: 'string', enum: ['app_package_type', 'media_id', 'team_id', 'pkg_id'] },
    timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
  };
  const tools = [
    tool('get_zt_ad_day_report', 'Daily ad report with activation and paid account metrics', schemaBase),
    tool('get_zt_ad_roi_report', 'ROI report for cumulative ROI and day ROI', schemaBase),
    tool('get_zt_ad_retention_report', 'Retention report supports device retention, register retention and paid retention', {
      ...schemaBase,
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
    }),
    tool('get_zt_hour_report', 'Hour report for time slot metrics', {
      ...schemaBase,
      hour: { type: 'string' },
    }),
  ];
  const manifest = buildReportCapabilityManifest(server(tools));
  const metrics = extractMetricKeysFromText(message);
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics,
    dimensions: extractDimensionKeysFromText(message),
    capabilities: manifest.tools,
  });
  assert.ok(decomposition.subQueries.length >= 4, 'MIG-050 should produce multiple executable sub-queries');
  const expectedTools = new Set(['get_zt_ad_day_report', 'get_zt_ad_roi_report', 'get_zt_ad_retention_report', 'get_zt_hour_report']);
  for (const expectedTool of expectedTools) {
    assert.ok(decomposition.subQueries.some(item => item.toolName === expectedTool), `${expectedTool} should be selected`);
  }
  for (const subQuery of decomposition.subQueries) {
    const selectedTool = tools.find(item => item.name === subQuery.toolName);
    const capability = manifest.tools.find(item => item.tool_name === subQuery.toolName);
    assert.ok(selectedTool, `tool config missing for ${subQuery.toolName}`);
    const result = buildMcpToolArgs(subQuery, selectedTool, {
      message,
      capability,
      baseInput: { appId: '10001' },
      resolvedFilters: {
        appPackageType: ['IOS'],
        mediaId: ['20001'],
        teamIds: ['30001'],
      },
    });
    assert.equal(result.ok, true, `${subQuery.toolName} sub-query should build schema-compatible args`);
    if (!result.ok) return;
    assert.equal(result.args.appId, '10001');
    assert.equal(result.args.startDate, '2026-01-01');
    assert.equal(result.args.endDate, '2026-01-01');
    assert.deepEqual(result.args.appPackageType, ['IOS']);
    assert.deepEqual(result.args.mediaId, ['20001']);
    assert.deepEqual(result.args.teamIds, ['30001']);
  }
}

function testRetentionTypesBecomeSeparateSubQueries(): void {
  const message = '3日设备留存数、3日注册留存数、4日首日付费留存数分别是多少';
  const metrics = extractMetricKeysFromText(message);
  const capabilities = buildReportCapabilityManifest(server([
    tool('get_zt_ad_retention_report', 'Retention report supports device retention, register retention and paid retention', { startDate: { type: 'string' }, endDate: { type: 'string' }, retentionType: { type: 'string' } }),
  ])).tools;
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics,
    dimensions: [],
    capabilities,
  });
  const retentionSubQueries = decomposition.subQueries.filter(item => item.toolName === 'get_zt_ad_retention_report');
  assert.equal(retentionSubQueries.length, 3, 'device/register/pay retention should be separate tool calls');
  assert.deepEqual(
    retentionSubQueries.map(item => item.extraInputs?.retentionType).sort(),
    ['DEVICE_RETENTION', 'PAY_D1_RETENTION', 'REG_RETENTION'],
  );
}

function testMig052TextCoversDailyRoiRetention(): void {
  const message = '指间2026-01-01那一周 IOS应用类型+巨量+广告投放部 总激活数、2周roi、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数 分别是多少';
  const metrics = extractMetricKeysFromText(message);
  assert.deepEqual(extractDimensionKeysFromText(message), [], 'MIG-052 filters should not become breakdown dimensions');
  const capabilities = buildReportCapabilityManifest(server([
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', { startDate: { type: 'string' }, endDate: { type: 'string' } }),
    tool('get_zt_ad_roi_report', 'ROI report tool', { startDate: { type: 'string' }, endDate: { type: 'string' } }),
    tool('get_zt_ad_retention_report', 'Retention report tool', { startDate: { type: 'string' }, endDate: { type: 'string' }, retentionType: { type: 'string' } }),
  ])).tools;
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics,
    dimensions: [],
    capabilities,
  });
  const tools = new Set(decomposition.subQueries.map(item => item.toolName));
  assert.ok(tools.has('get_zt_ad_day_report'), 'daily activation tool should be selected');
  assert.ok(tools.has('get_zt_ad_roi_report'), 'ROI tool should be selected');
  assert.ok(tools.has('get_zt_ad_retention_report'), 'retention tool should be selected');
}

function testMig052SubQueriesBuildWeeklySchemaArgs(): void {
  const message = '指间2026-01-01那一周 IOS应用类型+巨量+广告投放部 总激活数、2周roi、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数 分别是多少';
  const schemaBase = {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
    appPackageType: { type: 'array', items: { type: 'string' } },
    mediaId: { type: 'array', items: { type: 'string' } },
    teamIds: { type: 'array', items: { type: 'string' } },
    subGroup: { type: 'string', enum: ['app_package_type', 'media_id', 'team_id', 'pkg_id'] },
    timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
  };
  const tools = [
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', schemaBase),
    tool('get_zt_ad_roi_report', 'ROI report tool', schemaBase),
    tool('get_zt_ad_retention_report', 'Retention report tool', {
      ...schemaBase,
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
    }),
  ];
  const manifest = buildReportCapabilityManifest(server(tools));
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics: extractMetricKeysFromText(message),
    dimensions: [],
    capabilities: manifest.tools,
  });
  for (const subQuery of decomposition.subQueries) {
    const selectedTool = tools.find(item => item.name === subQuery.toolName);
    const capability = manifest.tools.find(item => item.tool_name === subQuery.toolName);
    assert.ok(selectedTool, `tool config missing for ${subQuery.toolName}`);
    const result = buildMcpToolArgs(subQuery, selectedTool, {
      message,
      capability,
      baseInput: { appId: '10001' },
      resolvedFilters: {
        appPackageType: ['IOS'],
        mediaId: ['20001'],
        teamIds: ['30001'],
      },
    });
    assert.equal(result.ok, true, `${subQuery.toolName} weekly sub-query should build schema-compatible args`);
    if (!result.ok) return;
    assert.equal(result.args.startDate, '2025-12-29');
    assert.equal(result.args.endDate, '2026-01-04');
    assert.equal(result.args.timeType, 'NATURAL_WEEK');
  }
}

function testMig053AppTypeBreakdownKeepsToolCoverage(): void {
  const message = '查询指间2026年1月1号广告投放部的总激活数、2日roi、第2日roi 、3日设备留存数、3日注册留存数、4日首日付费留存数在应用类型维度的分布情况';
  const metrics = extractMetricKeysFromText(message);
  const dimensions = extractDimensionKeysFromText(message);
  assert.deepEqual(dimensions, ['app_package_type'], '应用类型维度 should normalize to app_package_type');

  const capabilities = buildReportCapabilityManifest(server([
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', { startDate: { type: 'string' }, endDate: { type: 'string' }, appPackageType: { type: 'string' } }),
    tool('get_zt_ad_roi_report', 'ROI report tool', { startDate: { type: 'string' }, endDate: { type: 'string' }, appPackageType: { type: 'string' } }),
    tool('get_zt_ad_retention_report', 'Retention report tool', { startDate: { type: 'string' }, endDate: { type: 'string' }, retentionType: { type: 'string' }, appPackageType: { type: 'string' } }),
  ])).tools;
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics,
    dimensions,
    capabilities,
  });
  const tools = new Set(decomposition.subQueries.map(item => item.toolName));
  assert.ok(tools.has('get_zt_ad_day_report'), 'daily activation tool should be selected with app type breakdown');
  assert.ok(tools.has('get_zt_ad_roi_report'), 'ROI tool should be selected with app type breakdown');
  assert.ok(tools.has('get_zt_ad_retention_report'), 'retention tool should be selected with app type breakdown');
  assert.equal(
    decomposition.subQueries.filter(item => item.toolName === 'get_zt_ad_retention_report').length,
    3,
    'retention app type breakdown should still split by retentionType',
  );
}

function testMig053AppTypeBreakdownBuildsSchemaArgs(): void {
  const message = '查询指间2026年1月1号广告投放部的总激活数、2日roi、第2日roi 、3日设备留存数、3日注册留存数、4日首日付费留存数在应用类型维度的分布情况';
  const schemaBase = {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
    subGroup: { type: 'string', enum: ['app_package_type', 'media_id', 'team_id', 'pkg_id'] },
    timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
  };
  const tools = [
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', schemaBase),
    tool('get_zt_ad_roi_report', 'ROI report tool', schemaBase),
    tool('get_zt_ad_retention_report', 'Retention report tool', {
      ...schemaBase,
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
    }),
  ];
  const manifest = buildReportCapabilityManifest(server(tools));
  const dimensions = extractDimensionKeysFromText(message);
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics: extractMetricKeysFromText(message),
    dimensions,
    capabilities: manifest.tools,
  });
  for (const subQuery of decomposition.subQueries) {
    const selectedTool = tools.find(item => item.name === subQuery.toolName);
    const capability = manifest.tools.find(item => item.tool_name === subQuery.toolName);
    assert.ok(selectedTool, `tool config missing for ${subQuery.toolName}`);
    const result = buildMcpToolArgs(subQuery, selectedTool, {
      message,
      capability,
      baseInput: { appId: '10001' },
    });
    assert.equal(result.ok, true, `${subQuery.toolName} app type breakdown sub-query should build schema-compatible args`);
    if (!result.ok) return;
    assert.equal(result.args.startDate, '2026-01-01');
    assert.equal(result.args.endDate, '2026-01-01');
    assert.equal(result.args.subGroup, 'app_package_type');
  }
}

function testMig054TeamBreakdownKeepsToolCoverage(): void {
  const message = '查询指间2026年1月1号那一周广告媒体总激活数、2周roi 、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数在团队的分布情况';
  const metrics = extractMetricKeysFromText(message);
  const dimensions = extractDimensionKeysFromText(message);
  assert.ok(metrics.includes('roi_cumulative'), '2周roi should be treated as cumulative ROI');
  assert.ok(metrics.includes('roi_week'), '第2周roi should be treated as period ROI');
  assert.deepEqual(dimensions, ['team_id'], '团队分布 should normalize to team_id');

  const capabilities = buildReportCapabilityManifest(server([
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', { startDate: { type: 'string' }, endDate: { type: 'string' }, teamIds: { type: 'array', items: { type: 'string' } }, subGroup: { type: 'string' } }),
    tool('get_zt_ad_roi_report', 'ROI report tool', { startDate: { type: 'string' }, endDate: { type: 'string' }, teamIds: { type: 'array', items: { type: 'string' } }, subGroup: { type: 'string' } }),
    tool('get_zt_ad_retention_report', 'Retention report tool', { startDate: { type: 'string' }, endDate: { type: 'string' }, retentionType: { type: 'string' }, teamIds: { type: 'array', items: { type: 'string' } }, subGroup: { type: 'string' } }),
  ])).tools;
  const decomposition = decomposeQuery({
    originalQuery: message,
    metrics,
    dimensions,
    capabilities,
  });
  const tools = new Set(decomposition.subQueries.map(item => item.toolName));
  assert.ok(tools.has('get_zt_ad_day_report'), 'daily activation tool should be selected with team breakdown');
  assert.ok(tools.has('get_zt_ad_roi_report'), 'ROI tool should be selected with team breakdown');
  assert.ok(tools.has('get_zt_ad_retention_report'), 'retention tool should be selected with team breakdown');
}

function testMig055And058MonthRoiCoversCumulativeAndPeriod(): void {
  const messages = [
    '查询指间2025年12月1号那一月广告媒体的总激活数、2月累计roi 、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数',
    '指间2025-12-01那一月IOS应用类型+巨量+广告投放部 总激活数、2月roi、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数 分别是多少',
  ];
  for (const message of messages) {
    const metrics = extractMetricKeysFromText(message);
    assert.ok(metrics.includes('activation'), 'monthly cases should include activation');
    assert.ok(metrics.includes('roi_cumulative'), 'monthly cumulative ROI should be extracted');
    assert.ok(metrics.includes('roi_month'), '第2月roi should be extracted as period month ROI');
    assert.ok(metrics.includes('retention_device'), 'device retention should be extracted');
    assert.ok(metrics.includes('retention_register'), 'register retention should be extracted');
    assert.ok(metrics.includes('retention_pay_d1'), 'pay retention should be extracted');
  }
}

function testMig055And058SubQueriesBuildMonthlySchemaArgs(): void {
  const messages = [
    '查询指间2025年12月1号那一月广告媒体的总激活数、2月累计roi 、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数',
    '指间2025-12-01那一月IOS应用类型+巨量+广告投放部 总激活数、2月roi、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数 分别是多少',
  ];
  const schemaBase = {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
    appPackageType: { type: 'array', items: { type: 'string' } },
    mediaId: { type: 'array', items: { type: 'string' } },
    teamIds: { type: 'array', items: { type: 'string' } },
    subGroup: { type: 'string', enum: ['app_package_type', 'media_id', 'team_id', 'pkg_id'] },
    timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
  };
  const tools = [
    tool('get_zt_ad_day_report', 'Daily ad report with activation metrics', schemaBase),
    tool('get_zt_ad_roi_report', 'ROI report tool', schemaBase),
    tool('get_zt_ad_retention_report', 'Retention report tool', {
      ...schemaBase,
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
    }),
  ];
  const manifest = buildReportCapabilityManifest(server(tools));
  for (const message of messages) {
    const decomposition = decomposeQuery({
      originalQuery: message,
      metrics: extractMetricKeysFromText(message),
      dimensions: extractDimensionKeysFromText(message),
      capabilities: manifest.tools,
    });
    for (const subQuery of decomposition.subQueries) {
      const selectedTool = tools.find(item => item.name === subQuery.toolName);
      const capability = manifest.tools.find(item => item.tool_name === subQuery.toolName);
      assert.ok(selectedTool, `tool config missing for ${subQuery.toolName}`);
      const result = buildMcpToolArgs(subQuery, selectedTool, {
        message,
        capability,
        baseInput: { appId: '10001' },
        resolvedFilters: {
          appPackageType: ['IOS'],
          mediaId: ['20001'],
          teamIds: ['30001'],
        },
      });
      assert.equal(result.ok, true, `${subQuery.toolName} monthly sub-query should build schema-compatible args`);
      if (!result.ok) return;
      assert.equal(result.args.startDate, '2025-12-01');
      assert.equal(result.args.endDate, '2025-12-31');
      assert.equal(result.args.timeType, 'NATURAL_MONTH');
    }
  }
}

function testRetentionSubQueryBuildsSchemaArgs(): void {
  const message = '指间2026-02-01 IOS应用类型+自然量+广告投放部 全天激活数、3日注册留存数分别是多少';
  const retentionTool = tool(
    'get_zt_ad_retention_report',
    'Retention report tool',
    {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      promotionSource: { type: 'array', items: { type: 'string', enum: ['ORGANIC', 'AD'] } },
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
    },
  );
  const manifest = buildReportCapabilityManifest(server([retentionTool]));
  const subQuery = decomposeQuery({
    originalQuery: message,
    metrics: ['retention_register'],
    dimensions: [],
    capabilities: manifest.tools,
  }).subQueries[0];
  const result = buildMcpToolArgs(subQuery, retentionTool, {
    message,
    capability: manifest.tools.find(item => item.tool_name === retentionTool.name),
    baseInput: { appId: '10001' },
  });
  assert.equal(result.ok, true, 'retention sub-query should build schema-compatible args');
  if (!result.ok) return;
  assert.equal(result.args.appId, '10001');
  assert.equal(result.args.startDate, '2026-02-01');
  assert.equal(result.args.endDate, '2026-02-01');
  assert.deepEqual(result.args.promotionSource, ['ORGANIC']);
  assert.equal(result.args.retentionType, 'REG_RETENTION');
}

function testRetentionAppTypeBreakdownBuildsSchemaArgs(): void {
  const message = '查询指间2026年1月1号广告投放部的3日注册留存数在应用类型维度的分布情况';
  const retentionTool = tool(
    'get_zt_ad_retention_report',
    'Retention report tool',
    {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
      appPackageType: { type: 'array', items: { type: 'string' } },
      subGroup: { type: 'string', enum: ['app_package_type', 'media_id', 'team_ids', 'pkg_id'] },
      timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
    },
  );
  const manifest = buildReportCapabilityManifest(server([retentionTool]));
  const subQuery = decomposeQuery({
    originalQuery: message,
    metrics: ['retention_register'],
    dimensions: ['app_package_type'],
    capabilities: manifest.tools,
  }).subQueries[0];
  const result = buildMcpToolArgs(subQuery, retentionTool, {
    message,
    capability: manifest.tools.find(item => item.tool_name === retentionTool.name),
    baseInput: { appId: '10001' },
    resolvedFilters: { appPackageType: ['IOS'] },
  });
  assert.equal(result.ok, true, 'retention app type breakdown should build schema-compatible args');
  if (!result.ok) return;
  assert.deepEqual(result.args.appPackageType, ['IOS']);
  assert.equal(result.args.subGroup, 'app_package_type');
  assert.equal(result.args.retentionType, 'REG_RETENTION');
}

function testRetentionNaturalSourceUsesFullAllowedArray(): void {
  const message = '指间2026-02-01 IOS应用类型+自然量+广告投放部 3日注册留存数是多少';
  const retentionTool = tool(
    'get_zt_ad_retention_report',
    'Retention report tool',
    {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
      mediaId: { type: 'array', items: { type: 'string' } },
      timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
    },
  );
  const manifest = buildReportCapabilityManifest(server([retentionTool]));
  const subQuery = decomposeQuery({
    originalQuery: message,
    metrics: ['retention_register'],
    dimensions: [],
    capabilities: manifest.tools,
  }).subQueries[0];
  const result = buildMcpToolArgs(subQuery, retentionTool, {
    message,
    capability: manifest.tools.find(item => item.tool_name === retentionTool.name),
    baseInput: { appId: '10001' },
  });
  assert.equal(result.ok, true, 'retention natural source should build schema-compatible args');
  if (!result.ok) return;
  assert.deepEqual(result.args.promotionSource, ['ORGANIC', 'AD', 'MKT', 'OP']);
  assert.deepEqual(result.args.mediaId, ['99999']);
}

function testMig051RetentionPrimaryToolBuildsSchemaArgs(): void {
  const message = '指间2026-02-01 IOS应用类型+自然量+广告投放部 3日注册留存数是多少';
  const retentionTool = tool(
    'get_zt_ad_retention_report',
    'Retention report tool',
    {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      promotionSource: { type: 'array', items: { type: 'string', enum: ['AD', 'MKT', 'OP', 'ORGANIC'] } },
      retentionType: { type: 'string', enum: ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'] },
      appPackageType: { type: 'array', items: { type: 'string' } },
      mediaId: { type: 'array', items: { type: 'string' } },
      timeType: { type: 'string', enum: ['ALL', 'DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
    },
  );
  const manifest = buildReportCapabilityManifest(server([retentionTool]));
  const capability = manifest.tools.find(item => item.tool_name === retentionTool.name);
  const result = buildReportToolInput(
    retentionTool,
    message,
    { appId: '10001' },
    { appPackageType: ['IOS'] },
    capability,
  );
  assert.equal(result.preflight.ok, true, 'MIG-051 retention primary tool args should pass preflight');
  assert.equal(result.preflight.status, 'passed');
  assert.equal(result.input.appId, '10001');
  assert.equal(result.input.startDate, '2026-02-01');
  assert.equal(result.input.endDate, '2026-02-01');
  assert.deepEqual(result.input.promotionSource, ['ORGANIC', 'AD', 'MKT', 'OP']);
  assert.deepEqual(result.input.mediaId, ['99999']);
  assert.deepEqual(result.input.appPackageType, ['IOS']);
  assert.equal(result.input.retentionType, 'REG_RETENTION');
  assert.equal(result.input.timeType, 'DAY');
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

    testMig050TextTriggersMultiQuery();
    console.log('✓ testMig050TextTriggersMultiQuery passed');

    testMig050SubQueriesBuildSchemaArgs();
    console.log('✓ testMig050SubQueriesBuildSchemaArgs passed');

    testRetentionTypesBecomeSeparateSubQueries();
    console.log('✓ testRetentionTypesBecomeSeparateSubQueries passed');

    testMig052TextCoversDailyRoiRetention();
    console.log('✓ testMig052TextCoversDailyRoiRetention passed');

    testMig052SubQueriesBuildWeeklySchemaArgs();
    console.log('✓ testMig052SubQueriesBuildWeeklySchemaArgs passed');

    testMig053AppTypeBreakdownKeepsToolCoverage();
    console.log('✓ testMig053AppTypeBreakdownKeepsToolCoverage passed');

    testMig053AppTypeBreakdownBuildsSchemaArgs();
    console.log('✓ testMig053AppTypeBreakdownBuildsSchemaArgs passed');

    testMig054TeamBreakdownKeepsToolCoverage();
    console.log('✓ testMig054TeamBreakdownKeepsToolCoverage passed');

    testMig055And058MonthRoiCoversCumulativeAndPeriod();
    console.log('✓ testMig055And058MonthRoiCoversCumulativeAndPeriod passed');

    testMig055And058SubQueriesBuildMonthlySchemaArgs();
    console.log('✓ testMig055And058SubQueriesBuildMonthlySchemaArgs passed');

    testRetentionSubQueryBuildsSchemaArgs();
    console.log('✓ testRetentionSubQueryBuildsSchemaArgs passed');

    testRetentionAppTypeBreakdownBuildsSchemaArgs();
    console.log('✓ testRetentionAppTypeBreakdownBuildsSchemaArgs passed');

    testRetentionNaturalSourceUsesFullAllowedArray();
    console.log('✓ testRetentionNaturalSourceUsesFullAllowedArray passed');

    testMig051RetentionPrimaryToolBuildsSchemaArgs();
    console.log('✓ testMig051RetentionPrimaryToolBuildsSchemaArgs passed');

    console.log('\n✅ All multi-query-stage self-test cases passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
