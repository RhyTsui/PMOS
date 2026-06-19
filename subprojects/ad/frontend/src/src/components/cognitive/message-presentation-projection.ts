import type { ActionContract } from '@/contracts/semantic/action-contract';
import type { ComponentBinding, SemanticRegion, SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { Message, MessageContract } from '@/types';
import { normalizeAnswerMarkdown } from '@/lib/chat-runtime/answer-markdown-normalizer';

export type ComposerRecommendation = {
  title: string;
  description?: string;
  prompt: string;
};

export type PresentationProjection = {
  summaryRegion: SemanticRegion | null;
  capabilityGapRegion: SemanticRegion | null;
  dataRegions: SemanticRegion[];
  permissionRegion: SemanticRegion | null;
  emptyRegion: SemanticRegion | null;
  errorRegion: SemanticRegion | null;
  markdownRegion: SemanticRegion | null;
  sideRegions: SemanticRegion[];
  actionRegions: SemanticRegion[];
  suppressedRegions: SemanticRegion[];
  recommendations: ComposerRecommendation[];
};

const SIDE_BINDINGS = new Set<ComponentBinding>([
  'workflow-trace',
  'evidence-panel',
  'source-list',
  'asset-reference',
  'disclosure-panel',
]);

const SUPPRESSED_BINDINGS = new Set<ComponentBinding>([
  'ai-runtime',
  'form-input',
  'feedback-panel',
]);

const GAP_STATES = new Set([
  'no_full_coverage',
  'capability_gap',
  'missing_required_capability',
  'no_executable_capability',
  'tool_data_capability_missing',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function firstRegion(regions: SemanticRegion[], binding: ComponentBinding): SemanticRegion | null {
  return regions.find((region) => region.componentBinding === binding) || null;
}

function readWorkflowResult(message: Message): Record<string, unknown> | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  return isRecord(metadata.workflow_result) ? metadata.workflow_result : null;
}

function readMessageContract(message: Message): MessageContract | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const workflowResult = readWorkflowResult(message);
  if (isRecord(metadata.message_contract)) return metadata.message_contract as unknown as MessageContract;
  if (workflowResult && isRecord(workflowResult.message_contract)) return workflowResult.message_contract as unknown as MessageContract;
  return null;
}

function readBusinessSummary(message: Message, result: SemanticResultContract): Record<string, unknown> | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const workflowResult = readWorkflowResult(message);
  const candidates = [
    isRecord((result as unknown as Record<string, unknown>).business_summary) ? (result as unknown as Record<string, unknown>).business_summary : null,
    isRecord(metadata.business_summary) ? metadata.business_summary : null,
    workflowResult && isRecord(workflowResult.business_summary) ? workflowResult.business_summary : null,
    isRecord(metadata.message_contract) && isRecord(metadata.message_contract.business_summary) ? metadata.message_contract.business_summary : null,
  ];
  return candidates.find((item): item is Record<string, unknown> => Boolean(item)) || null;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？.!?])\s+|[\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstParagraph(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((item) => item.replace(/^#+\s*/, '').trim())
    .find(Boolean) || '';
}

function conciseSummary(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const sentences = splitSentences(normalized);
  const selected = sentences.length > 0 ? sentences.slice(0, 2).join(' ') : normalized;
  return selected.length > 220 ? `${selected.slice(0, 218)}...` : selected;
}

function markdownLooksInternal(markdown: string): boolean {
  if (!markdown.trim()) return false;
  if (/```/.test(markdown)) return true;
  if (/\b(trace|debug|raw_result|raw payload|fallbackReason|tool_name|capability_id|schema|contract)\b/i.test(markdown)) return true;
  const fieldLines = markdown.split('\n').filter((line) => /^\s*[-*]?\s*[a-zA-Z_][\w.:-]+\s*[:=]/.test(line));
  return fieldLines.length >= 4;
}

function isCapabilityGapRegion(region: SemanticRegion | null): boolean {
  if (!region) return false;
  const data = isRecord(region.data) ? region.data : {};
  const nested = isRecord(data.capability_gap) ? data.capability_gap : null;
  const type = safeString(data.type || nested?.type || region.metadata?.type);
  const reason = safeString(data.fallbackReason || data.blockingReason || region.metadata?.fallbackReason || region.metadata?.blockingReason);
  const state = safeString(region.state);
  return type === 'capability_gap' || GAP_STATES.has(type) || GAP_STATES.has(reason) || GAP_STATES.has(state);
}

function isTableDataRegion(region: SemanticRegion): boolean {
  if (region.componentBinding !== 'data-visualization') return false;
  const data = isRecord(region.data) ? region.data : {};
  const viewType = safeString(data.viewType || data.requestedView || data.chartType).toLowerCase();
  const directKind = safeString(data.kind).toLowerCase();
  return viewType === 'table' || directKind === 'table';
}

function isReportDetailResult(message: Message, result: SemanticResultContract): boolean {
  const metadata = isRecord(result.metadata) ? result.metadata : {};
  return message.intent_type === 'report_query'
    && (
      safeString(metadata.useCase).toLowerCase() === 'report-detail'
      || safeString(metadata.requestedView).toLowerCase() === 'detail'
      || result.resultId.startsWith('report-detail-')
    );
}

function buildAnswerMarkdownRegion(markdown: string): SemanticRegion | null {
  const normalizedMarkdown = normalizeAnswerMarkdown(markdown);
  if (!normalizedMarkdown.trim() || markdownLooksInternal(normalizedMarkdown)) return null;
  return {
    id: 'contract-answer-markdown',
    type: 'primary-result',
    componentBinding: 'markdown-result',
    title: '回答',
    state: 'ready',
    data: {
      markdown: normalizedMarkdown,
    },
    layoutHints: {
      placement: 'main',
      width: 'full',
      density: 'comfortable',
    },
    metadata: {
      source: 'message_contract.answer_markdown',
      field: 'answer_markdown',
      renderer: 'MarkdownResult',
    },
  };
}

function buildSummaryRegion(input: {
  message: Message;
  result: SemanticResultContract;
  decisionRegion: SemanticRegion | null;
  markdownRegion: SemanticRegion | null;
  hasStructuredMain: boolean;
}): SemanticRegion | null {
  const { message, result, decisionRegion, markdownRegion, hasStructuredMain } = input;
  if (decisionRegion && !isCapabilityGapRegion(decisionRegion)) {
    const data = isRecord(decisionRegion.data) ? decisionRegion.data : {};
    const summary = conciseSummary(
      safeString(data.summary)
        || safeString(data.brief)
        || safeString(data.description)
        || safeString(data.businessImpact || data.business_impact),
    );
    if (!summary) return null;
    return {
      ...decisionRegion,
      title: '\u67e5\u8be2\u7ed3\u679c',
      data: {
        ...data,
        title: '\u67e5\u8be2\u7ed3\u679c',
        brief: summary,
        business_impact: '',
        severity: '',
        confidence: '',
      },
    };
  }

  const businessSummary = readBusinessSummary(message, result);
  const businessText = businessSummary
    ? safeString(businessSummary.summary)
      || safeString(businessSummary.brief)
      || safeString(businessSummary.description)
      || safeString(businessSummary.business_impact || businessSummary.businessImpact)
    : '';
  const markdown = markdownRegion && isRecord(markdownRegion.data)
    ? safeString(markdownRegion.data.markdown, safeString(markdownRegion.data.text))
    : '';
  const fallbackText = hasStructuredMain || markdownLooksInternal(markdown) ? '' : firstParagraph(markdown);
  const summary = conciseSummary(businessText || fallbackText);
  if (!summary) return null;

  return {
    id: 'projected-query-result',
    type: 'summary',
    componentBinding: 'decision-card',
    title: '\u67e5\u8be2\u7ed3\u679c',
    state: 'ready',
    data: {
      title: '\u67e5\u8be2\u7ed3\u679c',
      brief: summary,
    },
  };
}

function normalizeAction(action: unknown): ComposerRecommendation | null {
  if (typeof action === 'string') {
    const label = action.trim();
    return label ? { title: label, prompt: label } : null;
  }
  if (!isRecord(action)) return null;
  const label = safeString(action.label || action.title || action.name);
  if (!label) return null;
  const target = isRecord(action.target) ? action.target : null;
  const prompt = safeString(action.prompt)
    || safeString(action.query)
    || safeString(action.text)
    || safeString(target?.value)
    || label;
  return {
    title: label,
    description: safeString(action.description || action.reason),
    prompt,
  };
}

function collectRecommendations(input: {
  result: SemanticResultContract;
  actionRegions: SemanticRegion[];
  message: Message;
}): ComposerRecommendation[] {
  const { result, actionRegions, message } = input;
  const contract = readMessageContract(message);
  const workflowResult = readWorkflowResult(message);
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const candidates: unknown[] = [];

  for (const region of actionRegions) {
    if (isRecord(region.data)) candidates.push(...safeArray(region.data.actions));
    candidates.push(...safeArray(region.actions));
  }
  candidates.push(...safeArray<ActionContract>(result.actions));
  candidates.push(...safeArray(contract?.next_actions));
  if (workflowResult) {
    candidates.push(...safeArray(workflowResult.next_actions));
    candidates.push(...safeArray(workflowResult.recommended_next_actions));
  }
  if (isRecord(metadata.business_summary)) {
    candidates.push(...safeArray(metadata.business_summary.suggested_questions));
  }
  if (workflowResult && isRecord(workflowResult.business_summary)) {
    candidates.push(...safeArray(workflowResult.business_summary.suggested_questions));
  }

  const byPrompt = new Map<string, ComposerRecommendation>();
  for (const item of candidates) {
    const normalized = normalizeAction(item);
    if (!normalized) continue;
    const key = normalized.prompt.toLowerCase();
    if (!byPrompt.has(key)) byPrompt.set(key, normalized);
  }
  return [...byPrompt.values()].slice(0, 3);
}

export function projectMessagePresentation(input: {
  message: Message;
  result: SemanticResultContract;
}): PresentationProjection {
  const { message, result } = input;
  const contract = readMessageContract(message);
  const answerMarkdownRegion = buildAnswerMarkdownRegion(safeString(contract?.answer_markdown));
  const suppressInlineReportDetailTable = Boolean(answerMarkdownRegion) && isReportDetailResult(message, result);
  const regions = result.regions || [];
  const sideRegions: SemanticRegion[] = [];
  const actionRegions: SemanticRegion[] = [];
  const suppressedRegions: SemanticRegion[] = [];
  const dataRegions: SemanticRegion[] = [];
  let permissionRegion: SemanticRegion | null = null;
  let emptyRegion: SemanticRegion | null = null;
  let errorRegion: SemanticRegion | null = null;
  let markdownRegion: SemanticRegion | null = null;
  let decisionRegion: SemanticRegion | null = null;
  let capabilityGapRegion: SemanticRegion | null = null;

  for (const region of regions) {
    if (region.componentBinding === 'data-visualization') {
      if (suppressInlineReportDetailTable && isTableDataRegion(region)) {
        suppressedRegions.push(region);
        continue;
      }
      dataRegions.push(region);
      continue;
    }
    if (region.componentBinding === 'decision-card') {
      if (isCapabilityGapRegion(region)) capabilityGapRegion = region;
      else if (!decisionRegion) decisionRegion = region;
      continue;
    }
    if (region.componentBinding === 'markdown-result') {
      markdownRegion = markdownRegion || region;
      continue;
    }
    if (region.componentBinding === 'action-bar') {
      actionRegions.push(region);
      continue;
    }
    if (region.componentBinding === 'permission-gate') {
      permissionRegion = permissionRegion || region;
      continue;
    }
    if (region.componentBinding === 'empty-state') {
      emptyRegion = emptyRegion || region;
      continue;
    }
    if (region.componentBinding === 'error-state') {
      errorRegion = errorRegion || region;
      continue;
    }
    if (SIDE_BINDINGS.has(region.componentBinding)) {
      sideRegions.push(region);
      continue;
    }
    if (SUPPRESSED_BINDINGS.has(region.componentBinding)) {
      suppressedRegions.push(region);
      continue;
    }
    suppressedRegions.push(region);
  }

  const nestedGap = firstRegion(regions, 'decision-card');
  if (!capabilityGapRegion && isCapabilityGapRegion(nestedGap)) capabilityGapRegion = nestedGap;

  markdownRegion = markdownRegion || answerMarkdownRegion;
  const hasStructuredMain = Boolean(decisionRegion || capabilityGapRegion || dataRegions.length || permissionRegion || errorRegion);
  const preferMarkdownMain = Boolean(answerMarkdownRegion) && !hasStructuredMain;
  const summaryRegion = capabilityGapRegion
    ? null
    : preferMarkdownMain
      ? null
      : buildSummaryRegion({ message, result, decisionRegion, markdownRegion, hasStructuredMain });

  const canUseMarkdown = Boolean(markdownRegion)
    && !hasStructuredMain
    && !summaryRegion
    && !markdownLooksInternal(isRecord(markdownRegion?.data) ? safeString(markdownRegion.data.markdown, safeString(markdownRegion.data.text)) : '');

  return {
    summaryRegion,
    capabilityGapRegion,
    dataRegions,
    permissionRegion,
    emptyRegion: hasStructuredMain ? null : emptyRegion,
    errorRegion,
    markdownRegion: canUseMarkdown ? markdownRegion : null,
    sideRegions,
    actionRegions,
    suppressedRegions,
    recommendations: collectRecommendations({ result, actionRegions, message }),
  };
}

export function getMessageComposerRecommendations(message: Message): ComposerRecommendation[] {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const workflowResult = readWorkflowResult(message);
  const semanticResult = isRecord(metadata.semantic_result)
    ? metadata.semantic_result as unknown as SemanticResultContract
    : workflowResult && isRecord(workflowResult.semantic_result)
      ? workflowResult.semantic_result as unknown as SemanticResultContract
      : null;
  if (!semanticResult?.regions) return [];
  return projectMessagePresentation({ message, result: semanticResult }).recommendations;
}
