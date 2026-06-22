import fs from 'node:fs';
import path from 'node:path';
import { executeMultiToolOrchestration } from '../src/lib/multi-tool-orchestrator';
import { buildReportCapabilityManifest } from '../src/lib/report-capability-manifest';
import { buildReportQueryInput } from '../src/lib/chat-runtime/report-query-input';

const repoRoot = path.resolve(process.cwd(), '../..');
const servers = JSON.parse(fs.readFileSync(path.join(repoRoot, '.runtime/zhitou-chat/v2/mcp-servers.json'), 'utf8')).servers || [];
const message = '指间2026-02-01 IOS应用类型+自然量+广告投放部 全天激活数、3日设备留存数、3日注册留存数、4日首日付费留存数分别是多少';
const manifest = buildReportCapabilityManifest(servers);

async function main() {
  const result = await executeMultiToolOrchestration({
    message,
    semanticFrame: {
      resolvedMetrics: [
        { key: 'activation' },
        { key: 'retention_device' },
        { key: 'retention_register' },
        { key: 'retention_pay_d1' },
      ],
      resolvedDimensions: [],
    },
    userRequirement: {
      metrics: ['activation', 'retention_device', 'retention_register', 'retention_pay_d1'],
      dimensions: [],
    },
    capabilities: manifest.tools,
    servers,
    baseInput: buildReportQueryInput(message, {
      businessContext: {},
      project: {
        availableProjects: [{ appId: '10100042', appName: '指间' }],
        currentProject: { appId: '10100042', appName: '指间' },
      },
    } as never),
    serviceType: 'join_table_report',
    timeRange: { start: '2026-02-01', end: '2026-02-01' },
    timeoutMs: 45000,
  });

  console.log(JSON.stringify({
    ok: result.ok,
    totalRows: result.federatedResult.totalRows,
    subQueries: result.decomposition.subQueries.map(item => ({
      id: item.subQueryId,
      tool: item.toolName,
      metrics: item.metrics,
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
      firstRow: item.rows[0],
    })),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
