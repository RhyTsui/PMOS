import type { TemplateTaskInput, TemplateTaskOutput } from './executor-registry';

/**
 * 拼表 + 定时更新执行器（mock-safe）
 *
 * 不接真实数仓 / 报表 API。
 * 返回 mock 的表格预览 + artifact 占位，用于打通生命周期。
 */
export async function executeJoinTableTask(input: TemplateTaskInput): Promise<TemplateTaskOutput> {
  const params = input.params || {};
  const sourceTables = Array.isArray(params.source_tables) ? params.source_tables : ['数据源 A', '数据源 B'];
  const outputFormat = typeof params.output_format === 'string' ? params.output_format : 'Excel';

  // Mock-safe: 生成占位表格预览（明确标注 mock）
  const mockColumns = ['日期', '项目', '媒体', '指标值'];
  const mockRows = [
    { '日期': '2026-06-22', '项目': '示例项目 A', '媒体': '巨量引擎', '指标值': 1234 },
    { '日期': '2026-06-22', '项目': '示例项目 B', '媒体': '腾讯广告', '指标值': 5678 },
    { '日期': '2026-06-22', '项目': '示例项目 C', '媒体': '快手', '指标值': 9012 },
  ];

  return {
    status: 'completed',
    summary: `已完成拼表任务，合并 ${sourceTables.length} 个数据源，生成 ${mockRows.length} 行数据。[mock-safe 演示数据]`,
    keyFindings: [
      `合并了 ${sourceTables.join(' + ')} 共 ${sourceTables.length} 个数据源`,
      `输出 ${mockRows.length} 行 × ${mockColumns.length} 列`,
      `格式：${outputFormat}`,
      '[mock-safe] 当前为演示数据，待真实数据源接入',
    ],
    templateData: {
      tablePreview: mockRows,
      columns: mockColumns,
      totalRows: mockRows.length,
      sourceTables,
      artifactName: `拼表-${new Date().toISOString().slice(0, 10)}.${outputFormat === 'CSV' ? 'csv' : 'xlsx'}`,
      mockSafe: true,
    },
    artifactRefs: [
      {
        type: 'file',
        uri: '#mock-artifact',
        name: `拼表-${new Date().toISOString().slice(0, 10)}.${outputFormat === 'CSV' ? 'csv' : 'xlsx'}`,
      },
    ],
    evidenceRefs: [
      { type: 'template', id: 'scheduled_join_table', label: '拼表模板' },
    ],
  };
}
