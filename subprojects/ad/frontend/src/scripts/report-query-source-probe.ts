import { createRequire } from 'node:module';
import path from 'node:path';
import { listMcpServers } from '../src/lib/mcp-server-store';
import { executeReportQueryStep } from '../src/lib/report-query-orchestrator';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as any;

const INPUT_FILE = path.resolve(process.env.REPORT_QUERY_PROBE_INPUT_FILE || 'E:/AI/ai-os/docs/sources/inbox/小乔智投测试集v1.1.xlsx');
const ROW_RANGE = process.env.REPORT_QUERY_PROBE_EXCEL_ROWS || '21';

const COL = {
  id: '用例ID',
  scene: '测试场景',
  prompt: '测试输入Prompt',
  keyPoint: '关键点',
};

function parseRowSelection(raw: string): number[] {
  const rows = new Set<number>();
  for (const token of raw.split(',').map(item => item.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const step = start <= end ? 1 : -1;
      for (let row = start; step > 0 ? row <= end : row >= end; row += step) {
        if (row >= 2) rows.add(row);
      }
      continue;
    }
    const row = Number(token);
    if (Number.isInteger(row) && row >= 2) rows.add(row);
  }
  return Array.from(rows).sort((a, b) => a - b);
}

function readCases() {
  const wb = XLSX.readFile(INPUT_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const headers = (rows[0] || []).map(String);
  const columnIndex = Object.fromEntries(Object.values(COL).map(name => [name, headers.indexOf(name)]));
  return parseRowSelection(ROW_RANGE).map(excelRow => {
    const row = rows[excelRow - 1] || [];
    return {
      excelRow,
      caseId: String(row[columnIndex[COL.id]] || '').trim(),
      scene: String(row[columnIndex[COL.scene]] || '').trim(),
      prompt: String(row[columnIndex[COL.prompt]] || '').trim(),
      keyPoint: String(row[columnIndex[COL.keyPoint]] || '').trim(),
    };
  }).filter(item => item.caseId && item.prompt);
}

function pickInterestingRows(rows: any[]) {
  return rows.slice(0, 12).map(row => ({
    date: row.date,
    media_id: row.media_id,
    app_type: row.app_type,
    sub_group: row.sub_group,
    cost_amount: row.cost_amount,
    composite_act_cnt: row.composite_act_cnt,
    composite_reg_cnt: row.composite_reg_cnt,
    consuming_composite_reg_cnt: row.consuming_composite_reg_cnt,
    roi_rate: row.roi_rate,
    roi1_rate: row.roi1_rate,
    roi2_rate: row.roi2_rate,
    cumulative_roi_rate: row.cumulative_roi_rate,
  })).map(row => Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ));
}

async function main() {
  const cases = readCases();
  const servers = await listMcpServers();
  const results = [];

  for (const item of cases) {
    const startedAt = Date.now();
    try {
      const result = await executeReportQueryStep({
        servers,
        message: item.prompt,
        baseInput: {},
      });
      const rows = result.report_query_result?.rows || [];
      results.push({
        ...item,
        status: result.status,
        business_outcome: result.business_outcome,
        tool: result.report_query_result?.tool_name,
        rowCount: rows.length,
        elapsedMs: Date.now() - startedAt,
        answer_markdown: result.report_query_result?.answer_markdown || result.message || '',
        query_input: result.report_query_result?.query_input,
        query_plan: result.report_query_result?.query_plan,
        sampleRows: pickInterestingRows(rows),
      });
    } catch (error) {
      results.push({
        ...item,
        status: 'error',
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify({
    inputFile: INPUT_FILE,
    selectedRows: cases.map(item => item.excelRow),
    generatedAt: new Date().toISOString(),
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
