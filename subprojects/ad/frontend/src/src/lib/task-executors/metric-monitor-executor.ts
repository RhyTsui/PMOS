import type { TemplateTaskInput, TemplateTaskOutput } from './executor-registry';

/**
 * 指标监控 + 定时更新执行器（mock-safe）
 *
 * 不调用真实报表查询 / 监控算法。
 * 支持两种测试模式：
 *   - no_anomaly：只写 TaskRun，不生成用户消息（skipUserMessage = true）
 *   - anomaly：生成 task_run_completed 消息并触发高亮
 *
 * 默认使用 anomaly 模式便于 UI 验收。
 */
export async function executeMetricMonitorTask(input: TemplateTaskInput): Promise<TemplateTaskOutput> {
  const params = input.params || {};
  const metrics = Array.isArray(params.metrics) ? params.metrics : ['ROI'];
  const entityScope = typeof params.entity_scope === 'string' ? params.entity_scope : 'project';
  const testMode = input.testMode || 'anomaly';

  if (testMode === 'no_anomaly') {
    // 无异常：只记录 TaskRun，不生成用户消息
    return {
      status: 'completed',
      summary: '指标监控检查完成，未发现异常。',
      skipUserMessage: true,  // 关键：不刷消息
      templateData: {
        alertLevel: 'normal',
        affectedEntities: [],
        suggestions: [],
        mockSafe: true,
      },
      evidenceRefs: [
        { type: 'template', id: 'scheduled_metric_monitor', label: '指标监控模板' },
      ],
    };
  }

  // anomaly 模式：生成异常结果
  const mockAffectedEntities = [
    { name: '示例项目 A', metric: 'ROI', value: 0.65, threshold: 0.80 },
    { name: '示例项目 B', metric: 'ROI', value: 0.72, threshold: 0.80 },
    { name: '示例项目 C', metric: metrics[0] || '指标', value: 50, threshold: 100 },
  ];

  const mockSuggestions = [
    '建议检查示例项目 A 的投放素材，ROI 持续低于阈值',
    '建议关注示例项目 B 的转化链路，异常可能与近期改动相关',
    '[mock-safe] 当前为演示数据，待真实监控数据接入',
  ];

  return {
    status: 'needs_action',
    summary: `发现 ${mockAffectedEntities.length} 个实体指标异常，涉及 ${metrics.join('、')}。[mock-safe 演示数据]`,
    keyFindings: [
      `${mockAffectedEntities.length} 个 ${entityScope} 实体低于阈值`,
      `涉及指标：${metrics.join('、')}`,
      '最高异常：示例项目 A（值 0.65，阈值 0.80）',
      '[mock-safe] 当前为演示数据',
    ],
    templateData: {
      alertLevel: 'warning',
      affectedEntities: mockAffectedEntities,
      suggestions: mockSuggestions,
      detailTable: mockAffectedEntities,
      mockSafe: true,
    },
    evidenceRefs: [
      { type: 'template', id: 'scheduled_metric_monitor', label: '指标监控模板' },
      { type: 'monitor_check', id: `check-${Date.now()}`, label: '阈值检查' },
    ],
  };
}
