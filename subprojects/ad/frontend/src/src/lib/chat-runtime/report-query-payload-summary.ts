import { isRecord } from '@/lib/chat-runtime/payload-compact';

function countReportRows(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.row_count === 'number' && Number.isFinite(value.row_count)) return value.row_count;
  return Array.isArray(value.rows) ? value.rows.length : undefined;
}

function countSemanticRows(value: unknown): number | undefined {
  if (!isRecord(value) || !Array.isArray(value.regions)) return undefined;
  let total = 0;
  let seen = false;
  for (const region of value.regions) {
    if (!isRecord(region) || !isRecord(region.data)) continue;
    const data = region.data;
    const dataset = Array.isArray(data.dataset) ? data.dataset : undefined;
    const rows = Array.isArray(data.rows) ? data.rows : undefined;
    if (dataset || rows) {
      seen = true;
      total += (dataset || rows || []).length;
    }
  }
  return seen ? total : undefined;
}

export function buildReportQueryPayloadSummary(params: {
  taskId: string;
  traceId: string;
  result: unknown;
  semanticResult: unknown;
}): Record<string, unknown> {
  const result = isRecord(params.result) ? params.result : {};
  const semanticResult = isRecord(params.semanticResult) ? params.semanticResult : {};
  return {
    ref_type: 'report_query_result_ref',
    task_id: params.taskId,
    trace_id: params.traceId,
    status: result.status,
    business_outcome: result.business_outcome,
    message: result.message,
    row_count: countReportRows(result),
    semantic_row_count: countSemanticRows(semanticResult),
    columns: Array.isArray(result.columns) ? result.columns : undefined,
    display_fields: Array.isArray(result.display_fields) ? result.display_fields : undefined,
    semantic_result_id: typeof semanticResult.resultId === 'string' ? semanticResult.resultId : undefined,
    screen_type: typeof semanticResult.screenType === 'string' ? semanticResult.screenType : undefined,
    retained_in: ['metadata.semantic_result', 'response_contract.semantic_result'],
  };
}
