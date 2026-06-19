import type { AgentProcessEvent, MessageRuntimeProjection } from '@/types';

type RuntimeStep = MessageRuntimeProjection['runtime_steps'][number];
type RuntimeDisclosureDisplay = {
  role: 'primary_step' | 'raw_log';
  group: 'routing' | 'capability' | 'source' | 'tool' | 'model' | 'result' | 'runtime';
  title?: string;
  logOnly?: boolean;
  summaryVisibility?: 'visible' | 'hidden';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function runtimeStepKind(event: AgentProcessEvent): RuntimeStep['kind'] {
  if (event.type.startsWith('mcp.')) return 'tool';
  if (event.type.startsWith('model.')) return 'model';
  if (event.type.startsWith('intent') || event.type.startsWith('context') || event.type.startsWith('capability')) return 'agent';
  return 'custom';
}

function runtimeStatusText(status: unknown): string {
  const value = String(status || '').toLowerCase();
  if (['success', 'succeeded', 'completed', 'complete'].includes(value)) return '已完成';
  if (['running', 'pending'].includes(value)) return '处理中';
  if (['waiting', 'queued'].includes(value)) return '等待中';
  if (['error', 'failed', 'rejected'].includes(value)) return '未完成';
  return '已记录';
}

function capabilityOutcomeText(output: Record<string, unknown>): string {
  const decision = String(output.execution_decision || '').toLowerCase();
  const fallbackReason = String(output.fallback_reason || '').toLowerCase();
  if (decision === 'executable') return '已找到可执行能力';
  if (decision === 'executable_with_presentation_fallback') return '已找到可执行能力，展示方式将降级';
  if (decision === 'needs_clarification') return '需要补充条件后继续';
  if (decision === 'no_executable_capability' || fallbackReason === 'no_full_coverage') return '未找到完全覆盖本次需求的能力';
  if (fallbackReason === 'no_capability') return '当前没有可用能力';
  if (output.selected_capability_id || output.selected_tool_name) return '已找到可执行能力';
  return '已完成能力检查';
}

function runtimeDisclosureDisplay(event: AgentProcessEvent): RuntimeDisclosureDisplay {
  switch (event.type) {
    case 'intent.detected':
    case 'route.resolved':
      return { role: 'primary_step', group: 'routing', title: '意图路由' };
    case 'route_observation':
      return { role: 'raw_log', group: 'routing', title: '路由观测', logOnly: true };
    case 'capability.checked':
      return { role: 'primary_step', group: 'capability', title: '能力发现' };
    case 'web.search':
    case 'knowledge.search':
      return { role: 'primary_step', group: 'source', summaryVisibility: 'hidden' };
    case 'web.result':
    case 'knowledge.result':
    case 'source.attached':
      return { role: 'raw_log', group: 'source', logOnly: true };
    case 'mcp.tool_call':
    case 'skill.started':
    case 'skill.step':
      return { role: 'primary_step', group: 'tool' };
    case 'mcp.tool_result':
    case 'mcp.tool_error':
    case 'skill.finished':
    case 'skill.failed':
      return { role: 'raw_log', group: 'tool', logOnly: true };
    case 'model.step':
      return { role: 'primary_step', group: 'model' };
    case 'ui.component_rendered':
    case 'answer.final':
      return { role: 'primary_step', group: 'result', title: '结果渲染' };
    default:
      return { role: 'raw_log', group: 'runtime', logOnly: true };
  }
}

export function mapProcessEventToRuntimeStep(event: AgentProcessEvent): RuntimeStep {
  const metadata = (event.output || event.input) as Record<string, unknown> | undefined;
  const disclosure = runtimeDisclosureDisplay(event);
  const base: RuntimeStep = {
    key: event.id,
    label: disclosure.title || event.label || event.type,
    status: event.status,
    summary: event.summary,
    kind: runtimeStepKind(event),
    durationMs: event.duration_ms,
    traceRef: event.id,
    metadata: {
      ...(metadata || {}),
      disclosure,
      eventType: event.type,
    },
  };

  if (event.type !== 'capability.checked') return base;

  const output = isRecord(event.output) ? event.output : {};
  const statusText = runtimeStatusText(event.status);
  const outcomeText = capabilityOutcomeText(output);
  return {
    ...base,
    label: event.label || '检查可用能力',
    summary: `检查可用能力：${statusText}\n结果：${outcomeText}`,
    metadata: {
      ...(metadata || {}),
      disclosure,
      eventType: event.type,
      display: {
        statusText,
        outcomeText,
      },
    },
  };
}
