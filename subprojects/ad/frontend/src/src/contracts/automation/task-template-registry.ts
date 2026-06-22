import type { TaskTemplateDefinition } from '@/types';

/**
 * 标准任务模板注册表
 *
 * 4 类标准模板：
 * 1. scheduled_join_table — 拼表 + 定时更新
 * 2. scheduled_aggregate_table — 聚合表 + 定时更新
 * 3. gi_keyword_daily_digest — GI 日报 + 关键词定制
 * 4. scheduled_metric_monitor — 指标监控 + 定时更新
 */

export const TASK_TEMPLATE_REGISTRY: Record<string, TaskTemplateDefinition> = {
  scheduled_join_table: {
    template_id: 'scheduled_join_table',
    name: '拼表 + 定时更新',
    description: '配置数据源、字段映射、过滤条件和更新时间，系统定时取数并生成更新后的拼表产物。',
    required_slots: [
      { key: 'source_tables', label: '数据源', type: 'string[]', description: '数据源表或报表列表', required: true },
      { key: 'join_keys', label: '关联字段', type: 'string[]', description: '拼表关联字段', required: true },
      { key: 'output_fields', label: '输出字段', type: 'string[]', description: '拼表输出字段', required: true },
      { key: 'schedule', label: '更新频率', type: 'schedule', description: '定时更新规则', required: true },
      { key: 'output_format', label: '输出格式', type: 'string', description: 'Excel 或 CSV', required: true },
    ],
    output_contract: {
      message_type: 'task_run_completed',
      supports_artifacts: true,
      supports_charts: false,
      supports_table_preview: true,
    },
    risk_level: 'L3',
    executor_binding: 'join-table-executor',
    intent_keywords: ['拼表', '合并表', '关联数据', '定时更新拼表', '更新这个表'],
  },

  scheduled_aggregate_table: {
    template_id: 'scheduled_aggregate_table',
    name: '聚合表 + 定时更新',
    description: '指定媒体、项目、指标、维度、时间范围和聚合规则，系统定时生成聚合表。',
    required_slots: [
      { key: 'metrics', label: '指标', type: 'string[]', description: '聚合指标列表', required: true },
      { key: 'dimensions', label: '维度', type: 'string[]', description: '分组维度', required: true },
      { key: 'filters', label: '过滤条件', type: 'object', description: '数据过滤条件', required: false },
      { key: 'aggregation_rules', label: '聚合规则', type: 'object', description: '聚合计算规则', required: true },
      { key: 'schedule', label: '更新频率', type: 'schedule', description: '定时更新规则', required: true },
      { key: 'output_format', label: '输出格式', type: 'string', description: 'Excel 或 CSV', required: true },
    ],
    output_contract: {
      message_type: 'task_run_completed',
      supports_artifacts: true,
      supports_charts: true,
      supports_table_preview: true,
    },
    risk_level: 'L3',
    executor_binding: 'aggregate-table-executor',
    intent_keywords: ['聚合表', '汇总', '聚合数据', '定时聚合', '每天聚合'],
  },

  gi_keyword_daily_digest: {
    template_id: 'gi_keyword_daily_digest',
    name: 'GI 日报 + 关键词定制',
    description: '配置行业、关键词、关注方向和日报时间，系统每天生成游戏行业情报日报。',
    required_slots: [
      { key: 'industry_scope', label: '行业范围', type: 'string', description: '关注的行业方向', required: true },
      { key: 'keywords', label: '关键词', type: 'string[]', description: '关注的关键词列表', required: true },
      { key: 'digest_time', label: '日报时间', type: 'schedule', description: '每天推送时间', required: true },
      { key: 'source_scope', label: '来源范围', type: 'string[]', description: '资讯来源范围', required: false },
      { key: 'output_preference', label: '输出偏好', type: 'string', description: '输出格式偏好', required: false },
    ],
    output_contract: {
      message_type: 'task_run_completed',
      supports_artifacts: false,
      supports_charts: false,
      supports_table_preview: false,
    },
    risk_level: 'L1',
    executor_binding: 'daily-digest-executor',
    intent_keywords: ['GI日报', '行业日报', '情报日报', '买量情报', '游戏行业情报', '关键词日报'],
  },

  scheduled_metric_monitor: {
    template_id: 'scheduled_metric_monitor',
    name: '指标监控 + 定时更新',
    description: '指定项目、媒体、指标、阈值、检查频率，系统定时检查并在异常时回写消息。',
    required_slots: [
      { key: 'metrics', label: '监控指标', type: 'string[]', description: '需要监控的指标', required: true },
      { key: 'entity_scope', label: '实体范围', type: 'string', description: 'project / media / app / campaign', required: true },
      { key: 'threshold_rules', label: '阈值规则', type: 'object', description: '异常阈值规则', required: true },
      { key: 'check_frequency', label: '检查频率', type: 'schedule', description: '定时检查频率', required: true },
      { key: 'time_window', label: '时间窗口', type: 'string', description: '每次检查的时间窗口', required: false },
    ],
    output_contract: {
      message_type: 'task_run_completed',
      supports_artifacts: false,
      supports_charts: true,
      supports_table_preview: true,
    },
    risk_level: 'L2',
    executor_binding: 'metric-monitor-executor',
    intent_keywords: ['监控', '异常', '阈值', '告警', 'ROI低于', '监控指标'],
  },
};

/**
 * 获取模板定义
 */
export function getTaskTemplate(templateId: string): TaskTemplateDefinition | undefined {
  return TASK_TEMPLATE_REGISTRY[templateId];
}

/**
 * 根据用户输入猜测模板类型
 */
export function guessTemplateFromInput(input: string): string | undefined {
  const lowerInput = input.toLowerCase();
  for (const [templateId, template] of Object.entries(TASK_TEMPLATE_REGISTRY)) {
    if (template.intent_keywords?.some((kw) => lowerInput.includes(kw.toLowerCase()))) {
      return templateId;
    }
  }
  return undefined;
}

/**
 * 获取所有模板列表
 */
export function listTaskTemplates(): TaskTemplateDefinition[] {
  return Object.values(TASK_TEMPLATE_REGISTRY);
}
