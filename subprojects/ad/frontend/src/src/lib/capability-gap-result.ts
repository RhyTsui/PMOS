import type { BusinessSummary } from '@/types';
import type {
  CapabilityBlockingReason,
  CapabilityExecutionDecision,
  CapabilitySelectionCandidate,
} from '@/contracts/capability/capability-manifest';
import type {
  CapabilityGapContract,
  CapabilityGapMissingCapability,
  CapabilityGapNextAction,
} from '@/contracts/capability/capability-gap-contract';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import { resolveBoundaryActionLabel, resolveCapabilityGapMessage } from '@/lib/chat-answer-message-catalog';

interface CapabilityDecisionLike {
  candidates: CapabilitySelectionCandidate[];
  fallbackReason?: string;
  executionDecision?: CapabilityExecutionDecision;
  blockingReason?: CapabilityBlockingReason;
  dataCoverage?: {
    covered?: boolean;
    missing?: string[];
  };
  presentationCoverage?: {
    covered?: boolean;
    missing?: string[];
  };
}

interface ReportStepLike {
  status?: string;
  message?: string;
  missing_fields?: string[];
  preflight?: {
    missing_capabilities?: string[];
    missing_context_fields?: string[];
  };
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join('、');
  if (typeof value === 'string') return value.trim();
  if (value === undefined || value === null) return '';
  return String(value);
}

function readableRequestedView(value: unknown): string {
  const text = displayValue(value);
  if (text === 'summary') return '概览';
  if (text === 'trend') return '趋势';
  if (text === 'table') return '表格';
  if (text === 'detail') return '明细';
  if (text === 'comparison') return '对比';
  if (text === 'diagnosis') return '诊断';
  if (text === 'report_query') return '报表查询';
  if (text === 'general') return '通用对话';
  return text;
}

function recognizedConditions(requirement: UserRequirementContract): CapabilityGapContract['recognizedConditions'] {
  const filters = Object.entries(requirement.filters || {})
    .map(([key, values]) => `${key}: ${displayValue(values)}`)
    .filter(Boolean);

  return [
    {
      label: '查询目标',
      value: readableRequestedView(requirement.requestedView || requirement.task),
      status: requirement.task === 'report_query' ? 'recognized' : 'unresolved',
    },
    {
      label: '指标',
      value: requirement.metrics.length ? requirement.metrics.join('、') : '未识别',
      status: requirement.metrics.length ? 'recognized' : 'missing',
    },
    {
      label: '时间范围',
      value: requirement.dateRange.value || '未识别',
      status: requirement.dateRange.type === 'unknown' ? 'missing' : 'recognized',
    },
    {
      label: '粒度',
      value: requirement.granularity,
      status: requirement.granularity ? 'recognized' : 'missing',
    },
    {
      label: '输出维度',
      value: requirement.dimensions
        .filter(item => item.role === 'x_axis' || item.role === 'breakdown')
        .map(item => `${item.key}(${item.role})`)
        .join('、') || '未指定',
      status: 'recognized',
    },
    {
      label: '筛选条件',
      value: filters.join('、') || '未指定',
      status: filters.length ? 'recognized' : 'missing',
    },
  ];
}

function missingTypeFromKey(key: string): CapabilityGapMissingCapability['type'] {
  if (key === 'metric' || key.startsWith('metric:')) return 'metric';
  if (key === 'date_range') return 'date_range';
  if (key.startsWith('dimension:') || key.startsWith('output_dimension:')) return 'dimension';
  if (key.startsWith('filter:') || key.startsWith('entity:')) return 'filter';
  if (key.startsWith('granularity:')) return 'granularity';
  if (key.startsWith('view:')) return 'presentation';
  return 'tool_schema';
}

function labelFromMissingKey(key: string): string {
  const [, rawLabel] = key.split(':');
  if (key === 'metric') return '指标';
  if (key === 'date_range') return '时间范围';
  if (key === 'output_dimension:date' || key === 'dimension:date') return '日期明细能力';
  if (key === 'granularity:day') return '按日粒度能力';
  if (key === 'metric:d1_roi') return '首日ROI';
  if (key === 'filter:app_package_type') return '安卓应用类型筛选';
  if (key === 'filter:terminal') return '终端筛选';
  if (rawLabel === '媒体平台选择' || rawLabel === '媒体平台' || key === 'media_id') return '媒体平台';
  if (rawLabel === '输出维度' || rawLabel === '查看维度') return '查看维度';
  if (!rawLabel) return '数据能力';
  return rawLabel;
}

function userMessageForMissing(type: CapabilityGapMissingCapability['type'], label: string): string {
  if (label === '媒体平台') return resolveCapabilityGapMessage('missing_media');
  if (label === '时间范围') return resolveCapabilityGapMessage('missing_date_range');
  if (label === '指标') return resolveCapabilityGapMessage('missing_metric');
  if (label === '项目') return resolveCapabilityGapMessage('missing_project');
  if (type === 'dimension' && label === '日期明细能力') return resolveCapabilityGapMessage('missing_tool_capability');
  if (type === 'granularity' && label === '按日粒度能力') return resolveCapabilityGapMessage('missing_granularity');
  if (type === 'metric' && label === '首日ROI') return resolveCapabilityGapMessage('missing_tool_capability');
  if (type === 'filter' && label === '安卓应用类型筛选') return resolveCapabilityGapMessage('missing_tool_capability');
  if (type === 'presentation') return resolveCapabilityGapMessage('missing_presentation');
  return resolveCapabilityGapMessage('missing_default', { label });
}

function missingCapabilities(args: {
  decision: CapabilityDecisionLike;
  reportStep?: ReportStepLike | null;
}): CapabilityGapMissingCapability[] {
  const missing = [
    ...(args.decision.dataCoverage?.missing || []),
    ...(args.reportStep?.missing_fields || []).map(item => `tool_schema:${item}`),
    ...(args.reportStep?.preflight?.missing_capabilities || []).map(item => `tool_schema:${item}`),
    ...(args.reportStep?.preflight?.missing_context_fields || []).map(item => `project_context:${item}`),
  ];

  const uniqueMissing = Array.from(new Set(missing.filter(Boolean)));
  if (!uniqueMissing.length && args.decision.blockingReason) uniqueMissing.push(args.decision.blockingReason);
  if (!uniqueMissing.length) uniqueMissing.push('tool_data_capability_missing');

  return uniqueMissing.map((key) => {
    const type = missingTypeFromKey(key);
    const label = labelFromMissingKey(key);
    const userMessage = userMessageForMissing(type, label);
    return { type, label, userMessage };
  });
}

function checkedCapabilities(candidates: CapabilitySelectionCandidate[]): CapabilityGapContract['checkedCapabilities'] {
  if (!candidates.length) {
    return [{
      name: resolveCapabilityGapMessage('checked_capabilities.empty_name'),
      status: 'not_available',
      description: resolveCapabilityGapMessage('checked_capabilities.empty_description'),
    }];
  }

  return candidates.slice(0, 5).map((candidate) => ({
    name: candidate.capability.source.toolName || candidate.capability.capabilityId,
    status: 'checked',
    description: candidate.dataCoverage?.covered
      ? resolveCapabilityGapMessage('checked_capabilities.covered_description')
      : resolveCapabilityGapMessage('checked_capabilities.missing_description', {
        labels: (candidate.dataCoverage?.missing || []).map(labelFromMissingKey).join('、') || '必要条件',
      }),
  }));
}

function nextActions(blockingReason?: CapabilityBlockingReason): CapabilityGapNextAction[] {
  if (blockingReason === 'entity_unresolved') {
    return [
      { label: resolveBoundaryActionLabel('resolve_entity'), actionType: 'resolve_entity' },
      { label: resolveBoundaryActionLabel('select_candidate'), actionType: 'select_candidate' },
    ];
  }
  if (blockingReason === 'metric_unresolved' || blockingReason === 'date_range_unresolved') {
    return [{ label: resolveBoundaryActionLabel('resolve_entity'), actionType: 'resolve_entity' }];
  }
  if (blockingReason === 'project_context_missing') {
    return [{ label: resolveBoundaryActionLabel('check_project_context'), actionType: 'check_project_context' }];
  }
  if (blockingReason === 'permission_denied') {
    return [{ label: resolveBoundaryActionLabel('check_permission'), actionType: 'check_permission' }];
  }
  return [
    { label: resolveBoundaryActionLabel('resolve_entity'), actionType: 'resolve_entity' },
  ];
}

function mainMessageForMissing(missing: CapabilityGapMissingCapability[]): string {
  const first = missing[0];
  if (!first) return resolveCapabilityGapMessage('empty_main_message');
  return first.userMessage;
}

export function buildCapabilityGapContract(args: {
  requirement: UserRequirementContract;
  decision: CapabilityDecisionLike;
  reportStep?: ReportStepLike | null;
}): CapabilityGapContract {
  const missing = missingCapabilities({ decision: args.decision, reportStep: args.reportStep });
  return {
    type: 'capability_gap',
    title: resolveCapabilityGapMessage('title'),
    mainMessage: mainMessageForMissing(missing),
    recognizedConditions: recognizedConditions(args.requirement),
    checkedCapabilities: checkedCapabilities(args.decision.candidates || []),
    missingCapabilities: missing,
    nextActions: nextActions(args.decision.blockingReason),
    severity: args.decision.executionDecision === 'needs_clarification' ? 'warning' : 'error',
    debug: {
      blockingReason: args.decision.blockingReason,
      fallbackReason: args.decision.fallbackReason,
    },
  };
}

export function buildCapabilityGapSemanticResult(args: {
  requirement: UserRequirementContract;
  decision: CapabilityDecisionLike;
  reportStep?: ReportStepLike | null;
  conversationId?: string;
  messageId?: string;
}): { semanticResult: SemanticResultContract & { business_summary: BusinessSummary }; businessSummary: BusinessSummary } {
  const gap = buildCapabilityGapContract(args);
  const businessSummary: BusinessSummary = {
    title: gap.title,
    brief: gap.mainMessage || resolveCapabilityGapMessage('empty_main_message'),
    severity: gap.severity === 'error' ? 'high' : 'medium',
    confidence: 'medium',
    business_impact: '',
    type: 'capability_gap',
    capability_gap: gap as unknown as Record<string, unknown>,
  };

  return {
    businessSummary,
    semanticResult: {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: `capability-gap-${Date.now()}`,
      conversationId: args.conversationId,
      messageId: args.messageId,
      screenType: 'empty-result',
      title: gap.title,
      description: resolveCapabilityGapMessage('semantic_summary_description'),
      createdAt: new Date().toISOString(),
      producer: {
        kind: 'agent',
        name: 'report',
      },
      regions: [],
      metadata: {
        source: 'capability-gap',
      },
      business_summary: businessSummary,
    },
  };
}
