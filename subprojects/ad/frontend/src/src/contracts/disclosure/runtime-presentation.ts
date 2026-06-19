import type { MessageDisclosureView } from './types';

type ExecutionStep = MessageDisclosureView['execution']['steps'][number];
type ExecutionSource = MessageDisclosureView['evidence']['sources'][number];
type ToolCallItem = MessageDisclosureView['execution']['toolCalls'][number];

export type RuntimeDetailSection = { title: string; value: unknown };

export type RuntimePresentationRow = {
  key: string;
  title: string;
  status: string;
  summary?: string;
  durationMs?: number;
  sources?: ExecutionSource[];
  detailSections?: RuntimeDetailSection[];
};

export type RuntimePresentationLog = {
  key: string;
  title: string;
  status: string;
  timestamp?: string;
  summary?: string;
  value: unknown;
};

export type RuntimePresentationPrompt = {
  key: string;
  title: string;
  matched?: boolean;
  value: unknown;
};

export type RuntimeDisclosurePresentation = {
  primaryRows: RuntimePresentationRow[];
  runtimeLogs: RuntimePresentationLog[];
  promptHits: RuntimePresentationPrompt[];
  traceAction?: {
    label: string;
    url: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function projectionFromView(view: MessageDisclosureView): Record<string, unknown> | null {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  const projection = metadata.message_runtime_projection;
  return isRecord(projection) ? projection : null;
}

function disclosureMeta(step: ExecutionStep): Record<string, unknown> {
  return isRecord(step.metadata) && isRecord(step.metadata.disclosure) ? step.metadata.disclosure : {};
}

function sourceUrl(source: ExecutionSource): string {
  if (source.url) return source.url;
  const locator = source.locator;
  return locator && locator.kind === 'url' ? String(locator.value || '') : '';
}

function sourceIdsForStep(step: ExecutionStep): Set<string> {
  return new Set([...(step.sourceRefs || []), ...(step.evidenceRefs || [])].filter(Boolean));
}

function sourcesForStep(step: ExecutionStep, index: number, sources: ExecutionSource[], firstSourceStepIndex: number): ExecutionSource[] {
  const ids = sourceIdsForStep(step);
  const matched = ids.size > 0 ? sources.filter((source) => ids.has(source.id)) : [];
  if (matched.length) return matched;
  const group = String(disclosureMeta(step).group || '');
  return sources.length && index === firstSourceStepIndex && group === 'source' ? sources : [];
}

function promptHitsFromView(view: MessageDisclosureView): RuntimePresentationPrompt[] {
  const projection = projectionFromView(view);
  const hits = Array.isArray(projection?.prompt_hits) ? projection.prompt_hits.filter(isRecord) : [];
  return hits.map((item, index) => ({
    key: String(item.key || item.prompt_id || item.promptId || `prompt-${index}`),
    title: String(item.title || item.key || item.prompt_id || item.promptId || `提示词 ${index + 1}`),
    matched: item.matched !== false,
    value: item,
  }));
}

function rawProcessEvents(view: MessageDisclosureView): Record<string, unknown>[] {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  return Array.isArray(metadata.process_events) ? metadata.process_events.filter(isRecord) : [];
}

function runtimeLogsFromView(view: MessageDisclosureView): RuntimePresentationLog[] {
  const events = rawProcessEvents(view);
  if (events.length > 0) {
    return events.map((event, index) => ({
      key: String(event.id || `process-event-${index}`),
      title: String(event.label || event.type || `事件 ${index + 1}`),
      status: String(event.status || 'recorded'),
      timestamp: String(event.started_at || event.completed_at || event.timestamp || ''),
      summary: typeof event.summary === 'string' ? event.summary : String(event.type || ''),
      value: event,
    }));
  }
  return view.execution.steps.map((step, index) => ({
    key: step.id || `runtime-step-${index}`,
    title: step.title || `步骤 ${index + 1}`,
    status: String(step.status || 'recorded'),
    timestamp: step.startedAt || step.endedAt,
    summary: step.summary,
    value: step,
  }));
}

function toolPayloadValue(item: ToolCallItem, side: 'request' | 'response'): unknown {
  if (side === 'request') return item.request?.normalized ?? item.request?.displayValue ?? item.arguments;
  return item.response?.normalized ?? item.response?.displayValue ?? item.result;
}

function toolLogsFromView(view: MessageDisclosureView): RuntimePresentationLog[] {
  return view.execution.toolCalls.map((tool, index) => ({
    key: tool.id || `tool-${index}`,
    title: tool.displayName || tool.name || `工具 ${index + 1}`,
    status: tool.status || 'recorded',
    timestamp: tool.startedAt || tool.endedAt,
    summary: tool.kind || tool.name,
    value: {
      ...tool,
      request: toolPayloadValue(tool, 'request'),
      response: toolPayloadValue(tool, 'response'),
    },
  }));
}

function eventType(value: unknown): string {
  return isRecord(value) ? String(value.type || '') : '';
}

function routeObservationLog(logs: RuntimePresentationLog[]): RuntimePresentationLog | undefined {
  return logs.find((log) => eventType(log.value) === 'route_observation');
}

function routeDecisionLog(logs: RuntimePresentationLog[]): RuntimePresentationLog | undefined {
  return logs.find((log) => eventType(log.value) === 'intent.detected' || eventType(log.value) === 'route.resolved');
}

function toolMatchesStep(item: ToolCallItem, step: ExecutionStep): boolean {
  const stepNames = [step.id, step.toolName, step.toolDisplayName].map((value) => String(value || '').toLowerCase()).filter(Boolean);
  const toolNames = [item.id, item.stepKey, item.name, item.displayName].map((value) => String(value || '').toLowerCase()).filter(Boolean);
  return toolNames.some((name) => stepNames.includes(name));
}

function isPrimaryStep(step: ExecutionStep): boolean {
  const disclosure = disclosureMeta(step);
  return disclosure.role === 'primary_step' || !disclosure.role;
}

function displayTitle(step: ExecutionStep): string {
  const disclosure = disclosureMeta(step);
  return String(disclosure.title || step.title || step.id);
}

function cleanSummary(step: ExecutionStep): string {
  const disclosure = disclosureMeta(step);
  return disclosure.summaryVisibility === 'hidden'
    ? ''
    : step.summary || '';
}

function mergeRuntimeLogs(logs: RuntimePresentationLog[], toolLogs: RuntimePresentationLog[]): RuntimePresentationLog[] {
  const keys = new Set(logs.map((log) => log.key));
  return [...logs, ...toolLogs.filter((log) => !keys.has(log.key))];
}

export function buildRuntimeDisclosurePresentation(view: MessageDisclosureView): RuntimeDisclosurePresentation {
  const logs = runtimeLogsFromView(view);
  const primarySteps = view.execution.steps.filter(isPrimaryStep);
  const firstSourceStepIndex = primarySteps.findIndex((step) => disclosureMeta(step).group === 'source');
  const consumedToolCalls = new Set<string>();
  const routeDecision = routeDecisionLog(logs);
  const routeObservation = routeObservationLog(logs);

  const primaryRows = primarySteps.map((step, index): RuntimePresentationRow => {
    const detailSections: RuntimeDetailSection[] = [];
    if (disclosureMeta(step).group === 'routing') {
      if (routeDecision) detailSections.push({ title: '路由决策', value: routeDecision.value });
      if (routeObservation) detailSections.push({ title: '路由观测', value: routeObservation.value });
    }
    view.execution.toolCalls.filter((item) => !consumedToolCalls.has(item.id) && toolMatchesStep(item, step)).forEach((tool) => {
      consumedToolCalls.add(tool.id);
      detailSections.push({ title: '请求参数', value: toolPayloadValue(tool, 'request') });
      detailSections.push({ title: '返回参数', value: toolPayloadValue(tool, 'response') });
    });
    return {
      key: step.id,
      title: displayTitle(step),
      status: String(step.status || view.execution.status || 'recorded'),
      summary: cleanSummary(step),
      durationMs: step.durationMs,
      sources: sourcesForStep(step, index, view.evidence.sources, firstSourceStepIndex),
      detailSections: detailSections.filter((item) => item.value !== undefined && item.value !== null && item.value !== ''),
    };
  });

  view.execution.toolCalls.filter((item) => !consumedToolCalls.has(item.id)).forEach((tool, index) => {
    primaryRows.push({
      key: tool.id || `tool-${index}`,
      title: tool.displayName || tool.name || `工具 ${index + 1}`,
      status: tool.status || 'recorded',
      detailSections: [
        { title: '请求参数', value: toolPayloadValue(tool, 'request') },
        { title: '返回参数', value: toolPayloadValue(tool, 'response') },
      ].filter((item) => item.value !== undefined && item.value !== null && item.value !== ''),
    });
  });

  const projection = projectionFromView(view);
  const traceUrl = typeof projection?.trace_url === 'string' ? projection.trace_url : '';
  return {
    primaryRows,
    runtimeLogs: mergeRuntimeLogs(logs, toolLogsFromView(view)),
    promptHits: promptHitsFromView(view),
    traceAction: traceUrl ? { label: '连弩 Trace', url: traceUrl } : undefined,
  };
}

export function runtimeSourceUrl(source: ExecutionSource): string {
  return sourceUrl(source);
}
