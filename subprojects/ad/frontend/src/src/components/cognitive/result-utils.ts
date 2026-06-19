import type { WorkflowResult } from '@/types';
import type { ReportQueryResult } from '@/lib/report-query-orchestrator';

export type InsightResult = WorkflowResult | ReportQueryResult | Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isReportQueryResult(value: unknown): value is ReportQueryResult {
  return isObject(value) && value.result_type === 'ReportQueryResult';
}

export function extractReportQueryResult(value: unknown): ReportQueryResult | null {
  if (!isObject(value)) return null;
  if (isReportQueryResult(value)) return value;

  const candidates: unknown[] = [
    value.report_query_result,
    value.output && isObject(value.output) ? value.output.report_query_result : null,
    value.metadata && isObject(value.metadata) ? value.metadata.report_query_result : null,
    value.workflow_result && isObject(value.workflow_result) ? value.workflow_result.report_query_result : null,
  ];

  for (const candidate of candidates) {
    if (isReportQueryResult(candidate)) return candidate;
  }

  return null;
}

export function extractInsightResult(value: unknown): InsightResult | null {
  if (!isObject(value)) return null;
  const reportResult = extractReportQueryResult(value);
  if (reportResult) return reportResult;
  return value;
}
