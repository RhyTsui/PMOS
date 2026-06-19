import { executeReportQueryStep } from '@/lib/report-query-orchestrator';
import type { AiNextAction } from '@/types';
import type { WorkflowStepRecord } from '@/lib/workflow-task-store';
import { compactRuntimePayload, isRecord, summarizePayloadForTrace } from './payload-compact';

export function workflowStepsFromToolChain(toolChain: Awaited<ReturnType<typeof executeReportQueryStep>>['tool_chain']): WorkflowStepRecord[] {
  return toolChain.filter(shouldExposeToolChainStep).map((item) => ({
    key: item.key,
    label: toolChainStepLabel(item),
    status: item.status === 'planned' ? 'running' : item.status === 'success' ? 'success' : item.status === 'failed' ? 'failed' : 'skipped',
    message: item.message,
    input: item.input,
    output: item.result && typeof item.result === 'object' ? item.result as Record<string, unknown> : undefined,
    started_at: new Date().toISOString(),
    completed_at: item.status === 'planned' ? undefined : new Date().toISOString(),
  }));
}

export function shouldExposeToolChainStep(item: Awaited<ReturnType<typeof executeReportQueryStep>>['tool_chain'][number]): boolean {
  if (item.required === false && item.status === 'skipped') return false;
  return true;
}

export function toolChainStepLabel(item: Awaited<ReturnType<typeof executeReportQueryStep>>['tool_chain'][number]): string {
  if (item.key === 'business_report') return '查询报表数据';
  if (item.key === 'media_dictionary') return '匹配媒体平台';
  if (item.key === 'os_dictionary' || item.key === 'terminal_dictionary') return '匹配终端';
  if (item.key === 'project_lookup') return '确认项目范围';
  if (item.key === 'knowledge_fallback') return '检索参考说明';
  if (item.key.endsWith('_dictionary')) return '匹配查询条件';
  if (item.key.endsWith('_selection')) return '确认查询条件';
  return item.tool_name ? '调用数据能力' : '处理查询条件';
}

export function buildEntityResolutionActions(params: {
  originalMessage: string;
  reportStep: Awaited<ReturnType<typeof executeReportQueryStep>>;
}): AiNextAction[] {
  const resolutions = params.reportStep.resolved_filters?.entityResolutions || [];
  return resolutions.flatMap((resolution) => {
    if (resolution.status !== 'needs_user_selection' && resolution.status !== 'needs_enrichment') return [];
    const candidates = (resolution.candidates || []).filter(candidate => candidate.id).slice(0, 4);
    if (!candidates.length) return [];
    return candidates.map((candidate, index) => ({
      label: candidate.name
        ? `选择 ${candidate.name}`
        : resolution.status === 'needs_enrichment'
          ? `确认编号 ${candidate.id}`
          : `选择编号 ${candidate.id}`,
      type: 'follow_up' as const,
      intent: index === 0 ? 'primary' : 'secondary',
      action: 'select_entity_candidate',
      risk_level: 'low' as const,
      auto_executable: true,
      params: {
        original_message: params.originalMessage,
        entityType: resolution.entityType,
        identifierKey: resolution.identifierKey,
        candidateId: candidate.id,
        candidateName: candidate.name,
        resolutionStatus: resolution.status,
        resolutionTraceId: resolution.normalizationCapabilityId,
      },
    }));
  });
}

export function compactToolChain(toolChain: Awaited<ReturnType<typeof executeReportQueryStep>>['tool_chain'] | undefined) {
  return (toolChain || []).map(item => ({
    key: item.key,
    tool_name: item.tool_name,
    server_name: item.server_name,
    status: item.status,
    required: item.required,
    message: item.message,
    input: compactRuntimePayload(item.input, { depth: 3, maxString: 800, maxArray: 20, maxKeys: 30 }),
    result: compactRuntimePayload(item.result, { depth: 3, maxString: 800, maxArray: 20, maxKeys: 30 }),
  }));
}

export function buildToolSnapshotForProjection(item: Awaited<ReturnType<typeof executeReportQueryStep>>['tool_chain'][number]) {
  const resultRecord = isRecord(item.result) ? item.result : {};
  const responsePayload = resultRecord.response_payload ?? resultRecord.response ?? item.result;
  const responseError = resultRecord.error || resultRecord.business_error
    ? {
      message: String(resultRecord.error || resultRecord.business_error),
      recoverable: false,
    }
    : undefined;
  const rowCount = typeof resultRecord.row_count === 'number'
    ? resultRecord.row_count
    : isRecord(responsePayload) && Array.isArray(responsePayload.rows)
      ? responsePayload.rows.length
      : Array.isArray(responsePayload)
        ? responsePayload.length
        : undefined;
  return {
    request: item.input ? {
      summary: summarizePayloadForTrace(item.input),
      normalized: compactRuntimePayload(item.input, { depth: 4, maxString: 1000, maxArray: 30, maxKeys: 50 }),
      redaction: { level: 'partial' as const },
    } : undefined,
    response: item.result ? {
      summary: summarizePayloadForTrace(item.result),
      normalized: compactRuntimePayload(responsePayload, { depth: 4, maxString: 1200, maxArray: 30, maxKeys: 50 }),
      rowCount,
      error: responseError,
      redaction: { level: 'partial' as const },
    } : undefined,
    quality: {
      status: item.status === 'failed' ? 'fail' as const : item.status === 'skipped' ? 'info' as const : 'pass' as const,
      summary: item.message || summarizePayloadForTrace(item.result),
    },
  };
}
