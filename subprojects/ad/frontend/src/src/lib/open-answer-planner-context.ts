import {
  runIntentOrchEnhancement,
  type IntentOrchEnhancementInput,
  type IntentOrchEnhancementResult,
} from './intent-orch-enhancer';
import { compactRuntimePayload, truncate } from './chat-runtime/payload-compact';

export const OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS = 3500;

function resolveOpenAnswerIntentOrchTimeoutMs(value: unknown = process.env.XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS;
  return Math.max(500, Math.min(12000, parsed));
}

export type OpenAnswerIntentOrchCandidate = {
  source: 'intentorch';
  status: 'success' | 'failed' | 'timeout' | 'disabled';
  duration_ms: number;
  parsed_intent_count: number;
  tool_selection_count: number;
  estimated_steps?: number;
  suggested_tools: Array<{
    tool_name: string;
    tool_description?: string;
    confidence?: number;
  }>;
  risk_flags: string[];
  error?: string;
  timeout_ms?: number;
};

export type OpenAnswerRouteCandidate = {
  source: 'request_understanding';
  intent_type?: string;
  confidence?: number | string;
  service_intent?: string;
  reason?: string;
};

export type OpenAnswerPublicWebCandidate = {
  source: 'public_web';
  status: 'success' | 'not_configured' | 'blocked' | 'failed' | 'skipped';
  capability_type?: string;
  reason_code?: string;
  source_count: number;
  source_required?: boolean;
  confidence?: number;
  evidence_role: 'candidate_evidence' | 'direct_answer_candidate';
  risk_flags: string[];
  fact_need?: unknown;
  provider_eligibility?: unknown;
  search_plan?: unknown;
};

export type OpenAnswerKnowledgeCandidate = {
  source: 'knowledge';
  status: 'searched' | 'available' | 'not_configured' | 'no_accessible_knowledge_base' | 'failed' | 'stale' | 'no_hit' | 'not_collected' | 'unknown';
  available: boolean;
  hit_count: number;
  knowledge_base_count?: number;
  evidence_role: 'candidate_evidence' | 'verification' | 'not_applicable';
  freshness: 'fresh' | 'stale' | 'unknown';
  risk_flags: string[];
  error?: string;
};

export type OpenAnswerPlannerCandidate =
  | OpenAnswerRouteCandidate
  | OpenAnswerIntentOrchCandidate
  | OpenAnswerPublicWebCandidate
  | OpenAnswerKnowledgeCandidate;

export type OpenAnswerArbitrationSummary = {
  selected_composer: 'chat_answer_composer';
  evidence_mode_hint: 'model_only' | 'knowledge_grounded' | 'mixed_context' | 'insufficient_evidence';
  evidence_need: 'none' | 'optional' | 'recommended' | 'required';
  candidate_sources: string[];
  risk_flags: string[];
  rejected_authorities: string[];
  final_authority: 'contract_safety';
};

export type OpenAnswerPlanningAudit = {
  summary: string;
  status: 'success' | 'error' | 'rejected';
  output: Record<string, unknown>;
};

export type OpenAnswerCapabilityOverview = {
  assistant_profile: {
    identity: string;
    scope: string[];
    role_boundary: string;
  };
  capability_overview: {
    generated_from: string[];
    dynamic_signals: Array<{
      key: string;
      label: string;
      available: boolean;
      detail?: string;
      count?: number;
    }>;
    manifest_summary: Array<{
      type: string;
      count: number;
      sample_names: string[];
    }>;
  };
};

export type OpenAnswerContextCandidateSource = 'memory' | 'recent_conversation';

export type OpenAnswerContextCandidate = {
  id: string;
  source: OpenAnswerContextCandidateSource;
  title?: string;
  content?: string;
  updatedAt?: string;
  importance?: number;
  keywords?: string[];
  metadata?: Record<string, unknown>;
};

export type OpenAnswerSelectedContextCandidate = OpenAnswerContextCandidate & {
  score: number;
  reasons: string[];
};

export type OpenAnswerContextSelectionResult = {
  selected: OpenAnswerSelectedContextCandidate[];
  rejected: Array<{
    id: string;
    source: OpenAnswerContextCandidateSource;
    score: number;
    reasons: string[];
  }>;
  policy: {
    strategy: 'generic_relevance_decay_importance';
    limit: number;
    min_score: number;
    query_terms: number;
    candidate_count: number;
  };
};

type IntentOrchRunner = (input: IntentOrchEnhancementInput) => Promise<IntentOrchEnhancementResult | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readKnowledgeHitCount(knowledge: unknown): number {
  if (!isRecord(knowledge)) return 0;
  const hitCount = readNumber(knowledge.hitCount);
  if (hitCount !== undefined) return hitCount;
  const hits = Array.isArray(knowledge.hits) ? knowledge.hits.length : 0;
  return hits;
}

function readKnowledgeStatus(knowledge: unknown): string {
  if (!isRecord(knowledge)) return 'unknown';
  return String(knowledge.status || (knowledge.available ? 'available' : 'not_configured'));
}

function readKnowledgeBaseCount(knowledge: unknown): number | undefined {
  if (!isRecord(knowledge)) return undefined;
  return readNumber(knowledge.knowledgeBaseCount);
}

function normalizeKnowledgeStatus(status: string): OpenAnswerKnowledgeCandidate['status'] {
  const normalized = status.trim();
  if (normalized === 'searched') return 'searched';
  if (normalized === 'available') return 'available';
  if (normalized === 'not_configured') return 'not_configured';
  if (normalized === 'no_accessible_knowledge_base') return 'no_accessible_knowledge_base';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'no_hit') return 'no_hit';
  if (/not_collected/.test(normalized)) return 'not_collected';
  if (/stale|old|outdated|expired/.test(normalized)) return 'stale';
  return 'unknown';
}

export function buildOpenAnswerKnowledgeCandidate(knowledge: unknown): OpenAnswerKnowledgeCandidate {
  const rawStatus = readKnowledgeStatus(knowledge);
  const hitCount = readKnowledgeHitCount(knowledge);
  const status = hitCount > 0 && rawStatus === 'not_configured'
    ? 'searched'
    : normalizeKnowledgeStatus(rawStatus);
  const knowledgeBaseCount = readKnowledgeBaseCount(knowledge);
  const stale = status === 'stale';
  const failed = status === 'failed';
  const unavailable = status === 'not_configured'
    || status === 'no_accessible_knowledge_base'
    || status === 'not_collected'
    || status === 'unknown';
  const available = isRecord(knowledge) && (hitCount > 0 || knowledge.available !== false) && !unavailable && !failed;
  const riskFlags = [
    hitCount > 0 ? 'knowledge_hit_available' : '',
    available && hitCount === 0 ? 'knowledge_no_hit' : '',
    status === 'not_configured' ? 'knowledge_not_configured' : '',
    status === 'no_accessible_knowledge_base' ? 'knowledge_no_accessible_knowledge_base' : '',
    status === 'not_collected' ? 'knowledge_not_collected' : '',
    failed ? 'knowledge_failed' : '',
    stale ? 'knowledge_stale_or_old_position' : '',
  ].filter(Boolean);
  const error = isRecord(knowledge) && typeof knowledge.error === 'string'
    ? truncate(knowledge.error, 120)
    : undefined;

  return {
    source: 'knowledge',
    status: available && hitCount === 0 && status === 'searched' ? 'no_hit' : status,
    available,
    hit_count: hitCount,
    knowledge_base_count: knowledgeBaseCount,
    evidence_role: hitCount > 0 && !stale && !failed ? 'candidate_evidence' : hitCount > 0 ? 'verification' : 'not_applicable',
    freshness: stale ? 'stale' : hitCount > 0 ? 'fresh' : 'unknown',
    risk_flags: riskFlags,
    error,
  };
}

function uniqueCompact(values: Array<string | undefined>, limit: number): string[] {
  const result: string[] = [];
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized || result.includes(normalized)) continue;
    result.push(truncate(normalized, 80));
    if (result.length >= limit) break;
  }
  return result;
}

function tokenizeContextText(value: string): string[] {
  const normalized = value.toLowerCase();
  const asciiTokens = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const cjkChars = [...normalized].filter((char) => /[\u4e00-\u9fff]/.test(char));
  const cjkBigrams = cjkChars.slice(0, -1).map((char, index) => `${char}${cjkChars[index + 1]}`);
  return Array.from(new Set([...asciiTokens, ...cjkChars, ...cjkBigrams])).filter(Boolean);
}

function contextCandidateText(candidate: OpenAnswerContextCandidate): string {
  return [
    candidate.title,
    candidate.content,
    ...(candidate.keywords || []),
  ].filter(Boolean).join(' ');
}

function isPreferenceLikeCandidate(candidate: OpenAnswerContextCandidate): boolean {
  const memoryType = typeof candidate.metadata?.memory_type === 'string'
    ? candidate.metadata.memory_type
    : '';
  return candidate.source === 'memory'
    && (
      memoryType === 'preference'
      || memoryType === 'instruction'
      || /偏好|风格|习惯|要求|prefer|preference|instruction/i.test(contextCandidateText(candidate))
    );
}

function hasExplicitCurrentTurnConflict(message: string, candidate: OpenAnswerContextCandidate): boolean {
  if (!isPreferenceLikeCandidate(candidate)) return false;
  const normalizedMessage = message.toLowerCase();
  const candidateTerms = uniqueCompact([
    ...(candidate.keywords || []),
    ...tokenizeContextText(contextCandidateText(candidate)).filter(term => term.length >= 2),
  ], 16);

  return candidateTerms.some((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:不要|不用|不需要|别|勿|取消|避免|不要再|不用再).{0,8}${escapedTerm}`, 'i').test(normalizedMessage)
      || new RegExp(`${escapedTerm}.{0,8}(?:不要|不用|不需要|别|勿|取消|避免)`, 'i').test(normalizedMessage);
  });
}

function recencyScore(updatedAt?: string, now: Date = new Date()): number {
  if (!updatedAt) return 0;
  const time = Date.parse(updatedAt);
  if (!Number.isFinite(time)) return 0;
  const ageDays = Math.max(0, (now.getTime() - time) / 86400000);
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.75;
  if (ageDays <= 30) return 0.45;
  if (ageDays <= 90) return 0.18;
  return 0.05;
}

function normalizedImportance(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value > 1) return Math.max(0, Math.min(1, value / 10));
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function selectOpenAnswerContextCandidates(params: {
  message: string;
  candidates: OpenAnswerContextCandidate[];
  limit: number;
  minScore?: number;
  now?: Date;
}): OpenAnswerContextSelectionResult {
  const limit = Math.max(0, params.limit);
  const minScore = params.minScore ?? 0.18;
  const now = params.now ?? new Date();
  const queryTerms = tokenizeContextText(params.message);
  const querySet = new Set(queryTerms);
  const scored = params.candidates.map((candidate) => {
    const candidateTerms = tokenizeContextText(contextCandidateText(candidate));
    const candidateSet = new Set(candidateTerms);
    const matched = queryTerms.filter((term) => candidateSet.has(term));
    const explicitConflict = hasExplicitCurrentTurnConflict(params.message, candidate);
    const lexicalScore = querySet.size ? matched.length / querySet.size : 0;
    const timeScore = recencyScore(candidate.updatedAt, now);
    const importanceScore = normalizedImportance(candidate.importance);
    const contentScore = contextCandidateText(candidate).trim() ? 1 : 0;
    const score = roundScore((lexicalScore * 0.58) + (timeScore * 0.18) + (importanceScore * 0.18) + (contentScore * 0.06));
    const reasons = [
      matched.length ? `matched_terms:${Math.min(matched.length, 12)}` : '',
      timeScore ? `recency:${roundScore(timeScore)}` : '',
      importanceScore ? `importance:${roundScore(importanceScore)}` : '',
      contentScore ? 'has_content' : 'empty_content',
      explicitConflict ? 'explicit_user_constraint_conflict' : '',
      explicitConflict ? 'current_turn_overrides_memory' : '',
    ].filter(Boolean);
    return { candidate, score, reasons, explicitConflict };
  }).sort((a, b) => b.score - a.score);

  const selected = scored
    .filter((item) => item.score >= minScore && !item.explicitConflict)
    .slice(0, limit)
    .map((item) => ({
      ...item.candidate,
      score: item.score,
      reasons: item.reasons,
    }));
  const selectedIds = new Set(selected.map((item) => item.id));
  const rejected = scored
    .filter((item) => !selectedIds.has(item.candidate.id))
    .map((item) => ({
      id: item.candidate.id,
      source: item.candidate.source,
      score: item.score,
      reasons: item.score < minScore && !item.explicitConflict ? [...item.reasons, 'below_min_score'] : item.reasons,
    }));

  return {
    selected,
    rejected,
    policy: {
      strategy: 'generic_relevance_decay_importance',
      limit,
      min_score: minScore,
      query_terms: querySet.size,
      candidate_count: params.candidates.length,
    },
  };
}

function readRiskFlags(result: IntentOrchEnhancementResult | null): string[] {
  if (!result) return [];
  if (!result.success) return ['candidate_unavailable'];
  if (!result.plan?.toolSelections.length) return ['no_tool_candidate'];
  return ['requires_arbitration'];
}

function normalizeIntentOrchCandidateError(error: unknown): string | undefined {
  const message = String(error || '').trim();
  if (!message) return undefined;
  if (/cloud intent engine/i.test(message) && /not initialized/i.test(message)) return 'engine_not_initialized';
  if (/api[_ -]?key|authorization|unauthorized|forbidden/i.test(message)) return 'model_auth_unavailable';
  if (/timeout|timed out|abort/i.test(message)) return 'intentorch_timeout';
  if (['model_service_disabled', 'model_api_key_missing', 'model_endpoint_missing', 'model_name_missing'].includes(message)) return message;
  if (message === 'sdk_not_available' || message === 'no_tools_available') return message;
  return 'intentorch_unavailable';
}

export function summarizeIntentOrchCandidate(
  result: IntentOrchEnhancementResult | null,
  durationMs = 0,
): OpenAnswerIntentOrchCandidate {
  if (!result) {
    return {
      source: 'intentorch',
      status: 'disabled',
      duration_ms: durationMs,
      parsed_intent_count: 0,
      tool_selection_count: 0,
      suggested_tools: [],
      risk_flags: [],
    };
  }

  const plan = result.plan;
  return {
    source: 'intentorch',
    status: result.success ? 'success' : 'failed',
    duration_ms: result.durationMs || durationMs,
    parsed_intent_count: plan?.parsedIntents.length || 0,
    tool_selection_count: plan?.toolSelections.length || 0,
    estimated_steps: plan?.estimatedSteps,
    suggested_tools: (plan?.toolSelections || []).slice(0, 5).map((selection) => ({
      tool_name: selection.toolName,
      tool_description: truncate(selection.toolDescription || '', 160),
      confidence: selection.confidence,
    })),
    risk_flags: readRiskFlags(result),
    error: normalizeIntentOrchCandidateError(result.error),
  };
}

export async function collectIntentOrchCandidateForOpenAnswer(
  input: IntentOrchEnhancementInput,
  options?: {
    timeoutMs?: number;
    runner?: IntentOrchRunner;
    now?: () => number;
  },
): Promise<OpenAnswerIntentOrchCandidate> {
  const timeoutMs = options?.timeoutMs ?? resolveOpenAnswerIntentOrchTimeoutMs();
  const runner = options?.runner ?? runIntentOrchEnhancement;
  const now = options?.now ?? Date.now;
  const startedAt = now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([runner(input), timeout]);
    const durationMs = Math.max(0, now() - startedAt);
    if (result && typeof result === 'object' && 'timedOut' in result) {
      return {
        source: 'intentorch',
        status: 'timeout',
        duration_ms: durationMs,
        parsed_intent_count: 0,
        tool_selection_count: 0,
        suggested_tools: [],
        risk_flags: ['candidate_timeout'],
        timeout_ms: timeoutMs,
      };
    }
    return summarizeIntentOrchCandidate(result as IntentOrchEnhancementResult | null, durationMs);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function buildOpenAnswerPlannerProjection(params: {
  routeCandidate: OpenAnswerRouteCandidate;
  intentOrchCandidate: OpenAnswerIntentOrchCandidate;
  publicWebCandidate?: OpenAnswerPublicWebCandidate;
  knowledge?: unknown;
  hasProjectContext?: boolean;
  hasMemoryContext?: boolean;
}): {
  plannerCandidates: OpenAnswerPlannerCandidate[];
  arbitrationSummary: OpenAnswerArbitrationSummary;
} {
  const knowledgeCandidate = buildOpenAnswerKnowledgeCandidate(params.knowledge);
  const hasKnowledgeEvidence = knowledgeCandidate.hit_count > 0 && knowledgeCandidate.freshness !== 'stale' && knowledgeCandidate.status !== 'failed';
  const hasStaleKnowledgeEvidence = knowledgeCandidate.hit_count > 0 && knowledgeCandidate.freshness === 'stale';
  const hasContextEvidence = Boolean(params.hasProjectContext || params.hasMemoryContext);
  const hasToolCandidate = params.intentOrchCandidate.tool_selection_count > 0;
  const hasPublicWebEvidence = params.publicWebCandidate?.status === 'success' && params.publicWebCandidate.source_count > 0;
  const candidateSources = [
    params.routeCandidate.source,
    params.intentOrchCandidate.status === 'disabled' ? '' : params.intentOrchCandidate.source,
    knowledgeCandidate.source,
    params.publicWebCandidate ? params.publicWebCandidate.source : '',
  ].filter(Boolean);
  const riskFlags = Array.from(new Set([
    ...params.intentOrchCandidate.risk_flags,
    ...knowledgeCandidate.risk_flags,
    ...(params.publicWebCandidate?.risk_flags || []),
    ...(params.intentOrchCandidate.status === 'failed' ? ['intentorch_failed'] : []),
    ...(params.intentOrchCandidate.status === 'timeout' ? ['intentorch_timeout'] : []),
    ...(hasToolCandidate ? ['tool_candidate_requires_execution_policy'] : []),
    ...(hasStaleKnowledgeEvidence ? ['knowledge_requires_refresh_before_confident_answer'] : []),
    ...(!hasKnowledgeEvidence && !hasContextEvidence && !hasPublicWebEvidence ? ['external_evidence_not_required_or_missing'] : []),
  ]));
  const evidenceModeHint = hasKnowledgeEvidence && hasContextEvidence
    ? 'mixed_context'
    : hasKnowledgeEvidence
      ? 'knowledge_grounded'
      : hasPublicWebEvidence
        ? 'mixed_context'
      : hasToolCandidate
        ? 'insufficient_evidence'
      : hasStaleKnowledgeEvidence
        ? 'insufficient_evidence'
        : 'model_only';
  const evidenceNeed = hasToolCandidate
    ? 'required'
    : hasStaleKnowledgeEvidence
      ? 'required'
    : params.publicWebCandidate?.source_required
      ? 'recommended'
    : hasKnowledgeEvidence
      ? 'recommended'
      : hasContextEvidence
        ? 'optional'
        : 'none';

  return {
    plannerCandidates: [params.routeCandidate, params.intentOrchCandidate, knowledgeCandidate, params.publicWebCandidate].filter(Boolean) as OpenAnswerPlannerCandidate[],
    arbitrationSummary: {
      selected_composer: 'chat_answer_composer',
      evidence_mode_hint: evidenceModeHint,
      evidence_need: evidenceNeed,
      candidate_sources: candidateSources,
      risk_flags: riskFlags,
      rejected_authorities: ['intentorch_direct_tool_selection', 'prompt_keyword_routing', 'raw_context_dump'],
      final_authority: 'contract_safety',
    },
  };
}

export function buildOpenAnswerPlanningMetadata(params: {
  plannerCandidates: OpenAnswerPlannerCandidate[];
  arbitrationSummary: OpenAnswerArbitrationSummary;
  contextSelection?: {
    memory?: OpenAnswerContextSelectionResult;
    recentConversations?: OpenAnswerContextSelectionResult;
  };
}): Record<string, unknown> {
  const plannerCandidates = params.plannerCandidates.map((candidate) => {
    if (candidate.source === 'intentorch') {
      return {
        source: candidate.source,
        status: candidate.status,
        parsed_intent_count: candidate.parsed_intent_count,
        tool_selection_count: candidate.tool_selection_count,
        estimated_steps: candidate.estimated_steps,
        suggested_tool_names: candidate.suggested_tools.map((tool) => tool.tool_name),
        suggested_tool_confidences: candidate.suggested_tools.map((tool) => tool.confidence),
        risk_flags: candidate.risk_flags,
        duration_ms: candidate.duration_ms,
        error: candidate.error,
      };
    }
    if (candidate.source === 'public_web') {
      return {
        source: candidate.source,
        status: candidate.status,
        capability_type: candidate.capability_type,
        reason_code: candidate.reason_code,
        source_count: candidate.source_count,
        source_required: candidate.source_required,
        confidence: candidate.confidence,
        evidence_role: candidate.evidence_role,
        risk_flags: candidate.risk_flags,
      };
    }
    if (candidate.source === 'knowledge') {
      return {
        source: candidate.source,
        status: candidate.status,
        available: candidate.available,
        hit_count: candidate.hit_count,
        knowledge_base_count: candidate.knowledge_base_count,
        evidence_role: candidate.evidence_role,
        freshness: candidate.freshness,
        risk_flags: candidate.risk_flags,
        error: candidate.error,
      };
    }
    return candidate;
  });
  return compactRuntimePayload({
    planner_candidates: plannerCandidates,
    arbitration_summary: params.arbitrationSummary,
    context_selection: params.contextSelection ? {
      memory: params.contextSelection.memory ? {
        selected_count: params.contextSelection.memory.selected.length,
        rejected_count: params.contextSelection.memory.rejected.length,
        policy: params.contextSelection.memory.policy,
        selected_ids: params.contextSelection.memory.selected.map((item) => item.id),
        selected: params.contextSelection.memory.selected.map((item) => ({
          id: item.id,
          source: item.source,
          score: item.score,
          reasons: item.reasons,
          updatedAt: item.updatedAt,
        })),
        rejected: params.contextSelection.memory.rejected.map((item) => ({
          id: item.id,
          source: item.source,
          score: item.score,
          reasons: item.reasons,
          reason_codes: item.reasons.join('|'),
        })),
      } : undefined,
      recent_conversations: params.contextSelection.recentConversations ? {
        selected_count: params.contextSelection.recentConversations.selected.length,
        rejected_count: params.contextSelection.recentConversations.rejected.length,
        policy: params.contextSelection.recentConversations.policy,
        selected_ids: params.contextSelection.recentConversations.selected.map((item) => item.id),
        selected: params.contextSelection.recentConversations.selected.map((item) => ({
          id: item.id,
          source: item.source,
          score: item.score,
          reasons: item.reasons,
          updatedAt: item.updatedAt,
        })),
        rejected: params.contextSelection.recentConversations.rejected.map((item) => ({
          id: item.id,
          source: item.source,
          score: item.score,
          reasons: item.reasons,
          reason_codes: item.reasons.join('|'),
        })),
      } : undefined,
    } : undefined,
  }, { depth: 5, maxString: 500, maxArray: 8, maxKeys: 24 }) as Record<string, unknown>;
}

function planningSourceLabel(source: string): string {
  if (source === 'request_understanding') return '请求理解';
  if (source === 'intentorch') return 'IntentOrch';
  if (source === 'knowledge') return '内部知识库';
  if (source === 'public_web') return '公开联网';
  return source;
}

function evidenceModeLabel(value: OpenAnswerArbitrationSummary['evidence_mode_hint']): string {
  if (value === 'knowledge_grounded') return '知识库证据';
  if (value === 'mixed_context') return '混合上下文证据';
  if (value === 'insufficient_evidence') return '证据不足';
  return '无需外部证据';
}

export function buildOpenAnswerPlanningAudit(params: {
  plannerCandidates: OpenAnswerPlannerCandidate[];
  arbitrationSummary: OpenAnswerArbitrationSummary;
  contextSelection?: {
    memory?: OpenAnswerContextSelectionResult;
    recentConversations?: OpenAnswerContextSelectionResult;
  };
}): OpenAnswerPlanningAudit {
  const metadata = buildOpenAnswerPlanningMetadata(params);
  const sources = params.arbitrationSummary.candidate_sources.map(planningSourceLabel);
  const selectedCount = (params.contextSelection?.memory?.selected.length || 0)
    + (params.contextSelection?.recentConversations?.selected.length || 0);
  const rejectedCount = (params.contextSelection?.memory?.rejected.length || 0)
    + (params.contextSelection?.recentConversations?.rejected.length || 0);
  const riskCount = params.arbitrationSummary.risk_flags.length;
  const summaryParts = [
    sources.length ? `已汇总 ${sources.join('、')} 候选` : '已完成候选汇总',
    `证据模式：${evidenceModeLabel(params.arbitrationSummary.evidence_mode_hint)}`,
    selectedCount || rejectedCount ? `上下文采纳 ${selectedCount} 项、淘汰 ${rejectedCount} 项` : '',
    riskCount ? `风险标记 ${riskCount} 项` : '无额外风险标记',
  ].filter(Boolean);

  return {
    summary: `${summaryParts.join('；')}。`,
    status: params.arbitrationSummary.evidence_mode_hint === 'insufficient_evidence' ? 'rejected' : 'success',
    output: metadata,
  };
}

export function buildOpenAnswerCapabilityOverview(params: {
  capabilityManifest: Array<{
    capabilityId?: string;
    displayName?: string;
    capabilityType?: string;
    description?: string;
    source?: { toolName?: string; serverId?: string };
    supportedServiceIntents?: string[];
  }>;
  knowledge?: unknown;
  hasProjectContext?: boolean;
  availableProjectCount?: number;
  activePreferenceCount?: number;
  memoryCount?: number;
  recentQuestionCount?: number;
}): OpenAnswerCapabilityOverview {
  const grouped = new Map<string, { type: string; count: number; sample_names: string[] }>();
  for (const capability of params.capabilityManifest.slice(0, 50)) {
    const type = String(capability.capabilityType || capability.source?.serverId || 'tool_capability');
    const existing = grouped.get(type) || { type, count: 0, sample_names: [] };
    existing.count += 1;
    existing.sample_names = uniqueCompact([
      ...existing.sample_names,
      capability.displayName,
      capability.source?.toolName,
      capability.capabilityId,
    ], 4);
    grouped.set(type, existing);
  }
  const manifestSummary = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const knowledgeHitCount = readKnowledgeHitCount(params.knowledge);
  const knowledgeStatus = readKnowledgeStatus(params.knowledge);
  const hasKnowledgeAccess = isRecord(params.knowledge) && params.knowledge.available !== false && knowledgeStatus !== 'not_configured';
  const memoryCount = params.memoryCount || 0;
  const activePreferenceCount = params.activePreferenceCount || 0;
  const recentQuestionCount = params.recentQuestionCount || 0;
  const availableProjectCount = params.availableProjectCount || 0;

  return {
    assistant_profile: {
      identity: '小乔智投通用 AI 助手',
      scope: [
        '理解用户问题、需求和上下文',
        '基于可用工具、知识、项目上下文、偏好和记忆组织回答',
        '在证据不足时说明边界并给出可验证的下一步',
      ],
      role_boundary: '用户角色和当前项目只影响关注重点，不改变助手身份。',
    },
    capability_overview: {
      generated_from: [
        'model_service_config',
        'capability_manifest',
        'knowledge_source_policy',
        'project_context',
        'user_preferences',
        'memory',
        'conversation_history',
        'temporal_context',
      ],
      dynamic_signals: [
        {
          key: 'open_answer_composition',
          label: '开放式回答、写作、总结、解释和需求整理',
          available: true,
        },
        {
          key: 'tool_capability_manifest',
          label: '可用工具和 MCP 能力',
          available: params.capabilityManifest.length > 0,
          count: params.capabilityManifest.length,
        },
        {
          key: 'knowledge_context',
          label: '内部知识库和资料检索上下文',
          available: hasKnowledgeAccess,
          detail: knowledgeStatus,
          count: knowledgeHitCount,
        },
        {
          key: 'project_context',
          label: '当前项目和用户权限上下文',
          available: Boolean(params.hasProjectContext || availableProjectCount > 0),
          count: availableProjectCount,
        },
        {
          key: 'preference_memory',
          label: '用户偏好、记忆和最近问题',
          available: activePreferenceCount > 0 || memoryCount > 0 || recentQuestionCount > 0,
          count: activePreferenceCount + memoryCount + recentQuestionCount,
        },
        {
          key: 'temporal_context',
          label: '当前时间、工作日和场景时效信息',
          available: true,
        },
      ],
      manifest_summary: manifestSummary,
    },
  };
}
