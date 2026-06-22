import fs from 'node:fs';
import path from 'node:path';
import { executeMultiToolOrchestration } from '../src/lib/multi-tool-orchestrator';
import { buildReportCapabilityManifest } from '../src/lib/report-capability-manifest';
import { buildReportQueryInput } from '../src/lib/chat-runtime/report-query-input';
import { extractDimensionKeysFromText, extractMetricKeysFromText } from '../src/lib/query-decomposer';

const repoRoot = path.resolve(process.cwd(), '../..');
const servers = JSON.parse(fs.readFileSync(path.join(repoRoot, '.runtime/zhitou-chat/v2/mcp-servers.json'), 'utf8')).servers || [];
const manifest = buildReportCapabilityManifest(servers);

const cases = [
  {
    id: 'MIG-050',
    message: '指间2026-01-01 IOS应用类型+巨量+广告投放部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数 分别是多少',
    timeRange: { start: '2026-01-01', end: '2026-01-01' },
  },
  {
    id: 'MIG-052',
    message: '指间2026-01-01那一周 IOS应用类型+巨量+广告投放部 总激活数、2周roi、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数 分别是多少',
    timeRange: { start: '2025-12-29', end: '2026-01-04' },
  },
  {
    id: 'MIG-053',
    message: '查询指间2026年1月1号广告投放部的总激活数、2日roi、第2日roi 、3日设备留存数、3日注册留存数、4日首日付费留存数在应用类型维度的分布情况',
    timeRange: { start: '2026-01-01', end: '2026-01-01' },
  },
] as const;

const interestingFields = [
  'dt',
  'app_package_type',
  'team_ids',
  'media_name',
  'composite_act_cnt',
  'composite_reg_cnt',
  'composite_roi45_rate',
  'roi45_rate',
  'composite_retention_d3_rate',
  'composite_retention_d3_cnt',
  'composite_retention_d4_rate',
  'composite_retention_d4_cnt',
  'composite_incr_cnt',
  'composite_pay_d1_cnt',
  'composite_pay_d1_rate',
  'composite_reg_d1_new_device_cnt',
  'composite_pay_d1_user_cnt',
];

function summarizeRow(row: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!row) return undefined;
  const output: Record<string, unknown> = {};
  for (const field of interestingFields) {
    if (field in row) output[field] = row[field];
  }
  return Object.keys(output).length ? output : Object.fromEntries(Object.entries(row).slice(0, 12));
}

async function runCase(testCase: typeof cases[number]) {
  const metrics = extractMetricKeysFromText(testCase.message);
  const dimensions = extractDimensionKeysFromText(testCase.message);
  const result = await executeMultiToolOrchestration({
    message: testCase.message,
    semanticFrame: {
      resolvedMetrics: metrics.map(key => ({ key })),
      resolvedDimensions: dimensions.map(key => ({ key })),
    },
    userRequirement: { metrics, dimensions },
    capabilities: manifest.tools,
    servers,
    baseInput: buildReportQueryInput(testCase.message, {
      businessContext: {},
      project: {
        availableProjects: [{ appId: '10100042', appName: '指间' }],
        currentProject: { appId: '10100042', appName: '指间' },
      },
    } as never),
    serviceType: 'join_table_report',
    timeRange: testCase.timeRange,
    timeoutMs: 45000,
  });

  return {
    id: testCase.id,
    ok: result.ok,
    totalRows: result.federatedResult.totalRows,
    metrics,
    dimensions,
    subQueries: result.decomposition.subQueries.map(item => ({
      id: item.subQueryId,
      tool: item.toolName,
      metrics: item.metrics,
      dimensions: item.dimensions,
      extraInputs: item.extraInputs,
    })),
    results: result.federatedResult.subQueryResults.map(item => ({
      id: item.subQueryId,
      tool: item.toolName,
      ok: item.ok,
      rows: item.rows.length,
      columns: item.columns.length,
      inputSummary: item.inputSummary,
      error: item.errorMessage,
      firstRow: summarizeRow(item.rows[0]),
    })),
  };
}

async function main() {
  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
