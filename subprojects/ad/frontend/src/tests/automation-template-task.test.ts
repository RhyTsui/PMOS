import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildAutomationDraftSuggestion } from '@/lib/automation-draft-store';
import { buildAutomationTaskSpreadsheetBuffer } from '@/lib/automation-task-artifact-builder';
import { understandAttachment } from '@/lib/attachment-understanding';
import type { AutomationDraftSuggestion, ScheduledTask } from '@/types';

function minimalTask(patch: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    id: 'task-template-001',
    name: '每日投放日报',
    description: '按模板生成日报文件',
    task_type: 'report_generate',
    status: 'active',
    frequency: 'daily',
    cron_expression: '0 9 * * *',
    next_run_at: Date.now(),
    created_by: 'acct-test',
    account_ids: [],
    app_names: [],
    monitor_metrics: ['消耗', '激活数'],
    alert_conditions: [],
    alert_channels: ['in_app'],
    alert_targets: [],
    custom_params: {},
    recent_executions: [],
    total_executions: 0,
    success_count: 0,
    failure_count: 0,
    enabled: true,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...patch,
  };
}

describe('Task Center report template automation', () => {
  it('builds a draft from a built-in report template', async () => {
    const draft = await buildAutomationDraftSuggestion({
      scopeKey: 'acct-test',
      templateId: 'report-template-game-project-daily-v06',
      message: '生成日报文件',
    });

    expect(draft.template_source).toBe('built_in');
    expect(draft.report_template_id).toBe('report-template-game-project-daily-v06');
    expect(draft.output_formats).toContain('excel');
    expect(draft.template_layout?.sheets.length).toBeGreaterThan(0);
    expect(draft.monitor_metrics.length).toBeGreaterThan(0);
  });

  it('parses uploaded Excel template sheets and headers', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['日期', '媒体', '消耗', '激活数'],
        ['2026-06-21', '测试媒体', 123, 45],
      ]),
      '日报模板',
    );
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const insight = await understandAttachment({
      attachmentId: 'att-template-001',
      fileName: '日报模板.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      kind: 'table',
      buffer,
    });

    expect(insight.parser_type).toBe('spreadsheet');
    expect(insight.tables[0]?.sheet_name).toBe('日报模板');
    expect(insight.tables[0]?.headers).toEqual(['日期', '媒体', '消耗', '激活数']);
    expect(insight.report_requirement?.source_attachment_ids).toContain('att-template-001');
  });

  it('generates workbook with template sheet, summary, sources, and missing fields', () => {
    const draft: AutomationDraftSuggestion = {
      name: '每日投放日报',
      description: '按模板生成日报文件',
      task_type: 'report_generate',
      trigger_type: 'cron',
      frequency: 'daily',
      cron_expression: '0 9 * * *',
      template_source: 'uploaded_excel',
      template_layout: {
        sheets: [{ sheet_name: '日报模板', headers: ['日期', '媒体', '消耗', '激活数'], source: 'attachment' }],
        required_fields: ['日期', '媒体', '消耗', '激活数'],
        missing_fields: [],
      },
      monitor_metrics: ['消耗', '激活数'],
      dimensions: ['媒体'],
      alert_channels: ['in_app'],
      alert_targets: [],
      output_formats: ['excel'],
      source_attachment_ids: ['att-template-001'],
      source_refs: [{ id: 'att-template-001', title: '日报模板.xlsx' }],
      missing_fields: [],
      confidence: 'high',
      reason: '已根据上传文件自动补全。',
    };
    const buffer = buildAutomationTaskSpreadsheetBuffer({
      task: minimalTask(),
      startedAt: Date.now(),
      prompt: '按模板生成日报文件',
      draft,
      queryResult: {
        status: 'success',
        tool_chain: [{
          key: 'business_report',
          tool_name: 'report.daily',
          server_name: 'report-mcp',
          status: 'success',
          required: true,
          message: 'ok',
        }],
        message: 'ok',
        report_query_result: {
          rows: [{ 日期: '2026-06-21', 媒体: '测试媒体', 消耗: 123, 激活数: 45 }],
          columns: ['日期', '媒体', '消耗', '激活数'],
          quality_check: { missing_fields: [], recommended_next_actions: [] },
          message: 'ok',
        },
      } as unknown as Parameters<typeof buildAutomationTaskSpreadsheetBuffer>[0]['queryResult'],
    });

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('日报模板');
    expect(workbook.SheetNames).toContain('运行摘要');
    expect(workbook.SheetNames).toContain('数据来源');
    expect(workbook.SheetNames).toContain('缺失字段');
  });
});
