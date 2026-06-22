import { executeJoinTableTask } from './join-table-executor';
import { executeAggregateTableTask } from './aggregate-table-executor';
import { executeDailyDigestTask } from './daily-digest-executor';
import { executeMetricMonitorTask } from './metric-monitor-executor';

/**
 * 模板任务执行器注册表
 *
 * 每个执行器返回 mock-safe 数据，不接真实 API / 算法。
 */

export interface TemplateTaskInput {
  taskId: string;
  runId: string;
  templateId: string;
  params: Record<string, unknown>;
  /** metric_monitor 专用：模拟模式 */
  testMode?: 'no_anomaly' | 'anomaly';
}

export interface TemplateTaskOutput {
  status: 'completed' | 'failed' | 'partial' | 'needs_action' | 'skipped';
  summary: string;
  keyFindings?: string[];
  templateData?: Record<string, unknown>;
  artifactRefs?: Array<{ type: string; uri: string; name?: string }>;
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
  sourceRefs?: Array<{ type: string; uri: string; title?: string }>;
  /** metric_monitor 专用：是否生成用户消息 */
  skipUserMessage?: boolean;
}

export async function executeTemplateTask(input: TemplateTaskInput): Promise<TemplateTaskOutput> {
  switch (input.templateId) {
    case 'scheduled_join_table':
      return executeJoinTableTask(input);
    case 'scheduled_aggregate_table':
      return executeAggregateTableTask(input);
    case 'gi_keyword_daily_digest':
      return executeDailyDigestTask(input);
    case 'scheduled_metric_monitor':
      return executeMetricMonitorTask(input);
    default:
      return {
        status: 'failed',
        summary: `未知模板 ${input.templateId}`,
      };
  }
}
