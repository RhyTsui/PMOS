import * as XLSX from 'xlsx';
import type { ScheduledTask } from '@/types';
import type { buildAutomationDraftSuggestion } from './automation-draft-store';
import type { executeReportQueryStep } from './report-query-orchestrator';

type AutomationDraft = Awaited<ReturnType<typeof buildAutomationDraftSuggestion>>;
type ReportQueryStepResult = Awaited<ReturnType<typeof executeReportQueryStep>>;
type TemplateLayout = NonNullable<AutomationDraft['template_layout']>;

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSheetValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

function sanitizeSheetName(name: string, fallback: string) {
  const cleaned = (name || fallback).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned || fallback;
}

function findRowValue(row: Record<string, unknown>, header: string) {
  if (header in row) return row[header];
  const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
  const key = Object.keys(row).find((item) => item.toLowerCase().replace(/\s+/g, '') === normalizedHeader);
  return key ? row[key] : '';
}

function buildRowsForHeaders(rows: Array<Record<string, unknown>>, headers: string[]) {
  if (!headers.length) return rows;
  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header) => {
      record[header] = normalizeSheetValue(findRowValue(row, header));
    });
    return record;
  });
}

function missingHeaders(rows: Array<Record<string, unknown>>, headers: string[]) {
  if (!headers.length) return [];
  const rowKeys = unique(rows.flatMap((row) => Object.keys(row)));
  const normalizedKeys = new Set(rowKeys.map((key) => key.toLowerCase().replace(/\s+/g, '')));
  return headers.filter((header) => !normalizedKeys.has(header.toLowerCase().replace(/\s+/g, '')));
}

function appendTemplateSheets(params: {
  workbook: XLSX.WorkBook;
  layout?: TemplateLayout;
  rows: Array<Record<string, unknown>>;
}) {
  const { workbook, layout, rows } = params;
  if (!layout?.sheets?.length) return [];
  const missing: string[] = [];
  layout.sheets.forEach((sheet, index) => {
    const headers = unique(sheet.headers || []);
    missing.push(...missingHeaders(rows, headers));
    const dataRows = rows.length
      ? buildRowsForHeaders(rows, headers)
      : [(headers.length ? Object.fromEntries(headers.map((header) => [header, ''])) : { 状态: '暂无数据' })];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dataRows, { header: headers.length ? headers : undefined }),
      sanitizeSheetName(sheet.sheet_name, `模板${index + 1}`),
    );
  });
  return unique(missing);
}

function appendSourceSheet(params: {
  workbook: XLSX.WorkBook;
  queryResult?: ReportQueryStepResult;
}) {
  const chain = params.queryResult?.tool_chain || [];
  const rows = chain.length
    ? chain.map((step) => ({
        步骤: step.key,
        数据来源: step.server_name,
        工具: step.tool_name,
        状态: step.status,
        说明: step.message || '',
      }))
    : [{ 步骤: '取数', 数据来源: '', 工具: '', 状态: params.queryResult?.status || 'not_configured', 说明: params.queryResult?.message || '暂无数据来源' }];
  XLSX.utils.book_append_sheet(params.workbook, XLSX.utils.json_to_sheet(rows), '数据来源');
}

function appendMissingSheet(params: {
  workbook: XLSX.WorkBook;
  draft: AutomationDraft;
  queryResult?: ReportQueryStepResult;
  templateMissing: string[];
}) {
  const missing = unique([
    ...(params.draft.missing_fields || []),
    ...(params.queryResult?.missing_fields || []),
    ...(params.queryResult?.report_query_result?.quality_check?.missing_fields || []),
    ...params.templateMissing,
  ]);
  const rows = missing.length
    ? missing.map((field) => ({ 缺失字段: field, 处理建议: '请确认模板字段、指标口径或数据来源是否已配置。' }))
    : [{ 缺失字段: '无', 处理建议: '本次没有发现必须补充的字段。' }];
  XLSX.utils.book_append_sheet(params.workbook, XLSX.utils.json_to_sheet(rows), '缺失字段');
}

export function buildAutomationTaskSpreadsheetBuffer(params: {
  task: ScheduledTask;
  startedAt: number;
  prompt: string;
  draft: AutomationDraft;
  queryResult?: ReportQueryStepResult;
}) {
  const { task, startedAt, prompt, draft, queryResult } = params;
  const rows = queryResult?.report_query_result?.rows || [];
  const columns = queryResult?.report_query_result?.columns || [];
  const workbook = XLSX.utils.book_new();
  const templateMissing = appendTemplateSheets({
    workbook,
    layout: draft.template_layout,
    rows,
  });
  const dataRows = rows.length
    ? rows.map((row) => {
        const record: Record<string, unknown> = {};
        const keys = columns.length ? columns : Object.keys(row);
        keys.forEach((key) => {
          record[key] = normalizeSheetValue(row[key]);
        });
        return record;
      })
    : [{ 状态: queryResult?.status || 'not_configured', 说明: queryResult?.message || '当前没有可写入的数据行' }];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataRows), '结果');

  const missing = queryResult?.report_query_result?.quality_check?.missing_fields || [];
  const nextActions = queryResult?.report_query_result?.quality_check?.recommended_next_actions || [];
  const summaryRows = [
    ['任务名称', task.name],
    ['任务类型', task.task_type],
    ['执行时间', new Date(startedAt).toISOString()],
    ['触发来源', task.automation_trigger || 'user_schedule'],
    ['可见性', task.automation_visibility || 'owner_visible'],
    ['模板来源', draft.template_source || task.custom_params?.template_source || 'none'],
    ['模板名称', draft.report_template_name || task.custom_params?.report_template_name || task.custom_params?.report_template_id || '未指定'],
    ['频率', draft.frequency],
    ['指标', draft.monitor_metrics.join('、') || '未指定'],
    ['维度', draft.dimensions.join('、') || '未指定'],
    ['查询状态', queryResult?.status || 'not_configured'],
    ['结果摘要', queryResult?.report_query_result?.message || queryResult?.message || draft.reason],
    ['缺失字段', missing.join('、') || '无'],
    ['建议动作', nextActions.join('、') || '打开文件查看完整结果'],
    ['输入快照', prompt],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), '运行摘要');
  appendSourceSheet({ workbook, queryResult });
  appendMissingSheet({ workbook, draft, queryResult, templateMissing });

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function normalizeRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      return safeText(record.id || record.source_id || record.evidence_id || record.ref_id);
    }
    return '';
  }).filter(Boolean);
}

export function collectAutomationExecutionRefs(queryResult?: ReportQueryStepResult) {
  const reportResult = queryResult?.report_query_result as {
    evidence_refs?: unknown;
    source_refs?: unknown;
    query_plan?: { evidence_refs?: unknown };
  } | undefined;
  const evidenceRefs = [
    ...normalizeRefs(reportResult?.evidence_refs),
    ...normalizeRefs(reportResult?.query_plan?.evidence_refs),
  ];
  const sourceRefs = [
    ...normalizeRefs(reportResult?.source_refs),
    ...((queryResult?.tool_chain || []).map((rawItem: unknown, index: number) => {
      const item = rawItem && typeof rawItem === 'object' ? rawItem as Record<string, unknown> : {};
      const server = safeText(item.server_name || item.server, 'unknown-server');
      const tool = safeText(item.tool_name || item.tool, `tool-${index + 1}`);
      return `src-${server}-${tool}`;
    })),
  ];
  return {
    evidenceRefs: [...new Set(evidenceRefs)],
    sourceRefs: [...new Set(sourceRefs)],
  };
}
