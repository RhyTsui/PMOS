import type { AnswerPolicy, RuntimeStage, RuntimeState } from '@/types';

export function defaultAnswerPolicy(): AnswerPolicy {
  return {
    verbosity: 'concise',
    evidence_visibility: 'hidden',
    reasoning_visibility: 'internal',
    confidence_policy: 'show_when_low',
    fallback_strategy: 'soft_degrade',
  };
}

export function createRuntimeState(
  startedAt: string,
  currentStage: RuntimeState['current_stage'],
  completedStages: RuntimeStage[] = [],
  status: RuntimeState['status'] = 'running',
): RuntimeState {
  const labelMap: Record<string, string> = {
    understanding: '正在理解请求...',
    context_loading: '正在补充上下文...',
    data_fetching: '正在获取信息...',
    analysis: '正在分析信息变化...',
    diagnosis: '正在定位原因...',
    knowledge_lookup: '正在校验历史规则与案例...',
    recommendation: '正在整理下一步建议...',
    response_generation: '正在生成回答...',
    completed: status === 'degraded' ? '已完成分析，部分信息降级' : '已完成处理',
  };

  return {
    current_stage: currentStage,
    completed_stages: completedStages,
    status,
    started_at: startedAt,
    duration_ms: Date.now() - new Date(startedAt).getTime(),
    label: labelMap[currentStage] || '正在处理...',
  };
}
