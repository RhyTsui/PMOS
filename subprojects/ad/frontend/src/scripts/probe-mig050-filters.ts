import fs from 'node:fs';
import path from 'node:path';
import { buildReportCapabilityManifest } from '../src/lib/report-capability-manifest';
import { buildReportQueryInput } from '../src/lib/chat-runtime/report-query-input';
import { resolveDictionaryFilters } from '../src/lib/report-query-orchestrator';
import { loadReportQueryPolicySync } from '../src/lib/report-query-policy-store';

const repoRoot = path.resolve(process.cwd(), '../..');
const servers = JSON.parse(fs.readFileSync(path.join(repoRoot, '.runtime/zhitou-chat/v2/mcp-servers.json'), 'utf8')).servers || [];
const manifest = buildReportCapabilityManifest(servers);
const policy = loadReportQueryPolicySync();
const message = '指间2026-01-01 IOS应用类型+巨量+广告投放部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数 分别是多少';
const baseInput = buildReportQueryInput(message, {
  businessContext: {},
  project: {
    availableProjects: [{ appId: '10100042', appName: '指间' }],
    currentProject: { appId: '10100042', appName: '指间' },
  },
} as never);

async function main() {
  const tools = manifest.tools.filter(tool => [
    'get_zt_ad_day_report',
    'get_zt_ad_roi_report',
    'get_zt_ad_retention_report',
    'get_zt_hour_report',
  ].includes(tool.tool_name));
  const output = [];
  for (const capability of tools) {
    const server = servers.find((item: { id?: string; name?: string }) => item.id === capability.server_id || item.name === capability.server_name);
    const tool = server?.tools?.find((item: { name?: string }) => item.name === capability.tool_name);
    const filters = await resolveDictionaryFilters({
      servers,
      message,
      appId: '10100042',
      policy,
      baseInput,
      reportTool: tool,
    });
    output.push({
      tool: capability.tool_name,
      mediaId: filters.mediaId,
      osTypes: filters.osTypes,
      terminalOs: filters.terminalOs,
      teamIds: filters.teamIds,
      appPackageType: filters.appPackageType,
      dynamicFilters: filters.dynamicFilters,
      traceWarnings: filters.trace_warnings,
      entityResolutions: filters.entity_resolutions?.map(item => ({
        type: item.entity_type,
        status: item.status,
        raw: item.raw_text,
        ids: item.ids,
        name: item.name,
        risk: item.risk,
      })),
    });
  }
  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
