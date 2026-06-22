import { listMcpServers } from '../src/lib/mcp-server-store';
import { executeReportQueryStep } from '../src/lib/report-query-orchestrator';

async function main() {
  const message = '指间山海2026-03-25日报中，查询广告投放部 各媒体激活数、注册数和消耗';
  const servers = await listMcpServers();
  const result = await executeReportQueryStep({
    servers,
    message,
    baseInput: { appId: '10100042' },
    capabilityDecision: {
      selected: { source: { toolName: 'get_zt_ad_day_report' } },
    },
  } as any);

  const rows = result.report_query_result?.rows || [];
  const mediaRows = rows
    .filter((row: any) => row?.media_id === '巨量广告' || row?.media_id === 'TapTap广告')
    .map((row: any) => ({
      date: row.date,
      media_id: row.media_id,
      cost_amount: row.cost_amount,
      composite_act_cnt: row.composite_act_cnt,
      composite_reg_cnt: row.composite_reg_cnt,
      consuming_composite_reg_cnt: row.consuming_composite_reg_cnt,
    }));

  console.log(JSON.stringify({
    status: result.status,
    business_outcome: result.business_outcome,
    tool: result.report_query_result?.tool_name,
    rowCount: rows.length,
    mediaRows,
    answer_markdown: result.report_query_result?.answer_markdown,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
