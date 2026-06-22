import type { TemplateTaskInput, TemplateTaskOutput } from './executor-registry';

/**
 * 聚合表 + 定时更新执行器（mock-safe）
 *
 * 不调用真实聚合函数 / 工具。
 * 返回 mock 的聚合预览 + artifact 占位。
 * 真实聚合函数待用户提供特征清单后绑定。
 */
export async function executeAggregateTableTask(input: TemplateTaskInput): Promise<TemplateTaskOutput> {
  const params = input.params || {};
  const metrics = Array.isArray(params.metrics) ? params.metrics : ['消耗', '激活', 'ROI'];
  const dimensions = Array.isArray(params.dimensions) ? params.dimensions : ['媒体', '项目'];
  const outputFormat = typeof params.output_format === 'string' ? params.output_format : 'Excel';

  // Mock-safe: 生成占位聚合结果（明确标注 mock）
  const mockColumns = [...dimensions, ...metrics];
  const mockRows = [
    { '媒体': '巨量引擎', '项目': '示例 A', '消耗': 12345, '激活': 678, 'ROI': 2.35 },
    { '媒体': '腾讯广告', '项目': '示例 B', '消耗': 23456, '激活': 890, 'ROI': 1.87 },
    { '媒体': '快手', '项目': '示例 C', '消耗': 8901, '激活': 345, 'ROI': 3.12 },
    { '媒体': '百度', '项目': '示例 D', '消耗': 5678, '激活': 234, 'ROI': 1.45 },
  ];

  return {
    status: 'completed',
    summary: `已完成聚合计算：按 ${dimensions.join('、')} 维度聚合 ${metrics.join('、')} 等 ${metrics.length} 个指标，共 ${mockRows.length} 条结果。[mock-safe 演示数据]`,
    keyFindings: [
      `聚合维度：${dimensions.join('、')}`,
      `聚合指标：${metrics.join('、')}`,
      `输出 ${mockRows.length} 条结果`,
      `格式：${outputFormat}`,
      '[mock-safe] 当前为演示数据，待真实聚合函数接入',
    ],
    templateData: {
      tablePreview: mockRows,
      columns: mockColumns,
      summary: `按 ${dimensions.join('、')} 维度聚合了 ${metrics.join('、')}`,
      artifactName: `聚合表-${new Date().toISOString().slice(0, 10)}.${outputFormat === 'CSV' ? 'csv' : 'xlsx'}`,
      mockSafe: true,
    },
    artifactRefs: [
      {
        type: 'file',
        uri: '#mock-artifact',
        name: `聚合表-${new Date().toISOString().slice(0, 10)}.${outputFormat === 'CSV' ? 'csv' : 'xlsx'}`,
      },
    ],
    evidenceRefs: [
      { type: 'template', id: 'scheduled_aggregate_table', label: '聚合表模板' },
    ],
  };
}
