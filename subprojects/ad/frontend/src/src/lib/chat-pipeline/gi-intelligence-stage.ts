import type { MessageContract } from '@/types';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { buildGiQueryFromMessage, fetchGiIntelligence, type GiArticleItem, type GiIntelligenceResult } from '@/lib/gi-intelligence-client';
import { createRuntimeState, defaultAnswerPolicy } from '@/lib/chat-runtime/runtime-state';
import { createProcessEvent, pushSourceAttachedEvents } from '@/lib/chat-route-primitives';
import { buildSemanticMessageContract, buildSemanticWorkflowResult } from '@/contracts/result-assembly/semantic-result-assembly';
import { buildResponseContract } from '@/lib/response-contract';
import { buildAnswerOrigin, buildMessageRuntimeProjection } from '@/lib/chat-runtime/message-runtime-projection';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { recordEvidence, recordEvidenceBatch } from '@/lib/evidence-ledger';
import { addEvidenceRef } from '@/lib/case-frame-helpers';

function verificationText(status?: string): string {
  if (status === 'verified') return '已核验';
  if (status === 'conflicted') return '存在冲突';
  if (status === 'unverified') return '待核验';
  if (status === 'low_confidence') return '低置信';
  if (status === 'expired') return '已过期';
  return status || '未标注';
}

function buildAnswer(result: GiIntelligenceResult): string {
  if (result.status === 'not_configured' || result.status === 'failed') {
    return result.summary;
  }
  if (!result.items.length) {
    return result.seedExpansion?.message
      ? `${result.summary}\n\n${result.seedExpansion.message}`
      : result.summary;
  }
  const surfaced = result.items.slice(0, 8);
  const lines = surfaced.map((item, index) => {
    const meta = [
      item.sourceName || item.sourceType,
      item.publishedAt ? item.publishedAt.slice(0, 10) : '',
      item.priority,
      verificationText(item.verificationStatus),
    ].filter(Boolean).join(' · ');
    const link = item.url ? ` [查看原文](${item.url})` : '';
    return `${index + 1}. **${item.title}**${meta ? `（${meta}）` : ''}\n   ${item.summary}${link}`;
  });
  const more = result.total && result.total > surfaced.length
    ? `\n\n还有 ${result.total - surfaced.length} 条可继续加载。你可以说“继续看下一批”或补充关键词缩小范围。`
    : '';
  const seed = result.seedExpansion?.message ? `\n\n${result.seedExpansion.message}` : '';
  return [
    result.summary,
    '',
    ...lines,
    `${more}${seed}`,
  ].join('\n');
}

function buildSemanticResult(ctx: ChatPipelineContext, result: GiIntelligenceResult, answer: string, processEventIds: string[]): SemanticResultContract {
  const sourceRefs = result.sourceRefs.map((source) => ({
    id: source.id || source.url || source.title,
    type: source.url ? 'url' as const : 'tool' as const,
    title: source.title,
    description: source.snippet || source.prompt,
    locator: source.url ? { kind: 'url' as const, value: source.url } : undefined,
    retrievedAt: result.generatedAt || new Date().toISOString(),
    freshness: {
      status: 'fresh' as const,
      retrievedAt: result.generatedAt || new Date().toISOString(),
      generatedAt: result.generatedAt,
    },
    reliability: {
      level: source.status === 'waiting' ? 'unknown' as const : 'trusted' as const,
      explanation: source.prompt || '来自 GI 情报服务返回的文章或事件来源。',
    },
    citationPolicy: {
      required: true,
      format: 'panel' as const,
      clickable: Boolean(source.url),
    },
    metadata: {
      source_type: source.source_type,
      source: source.source,
    },
  }));
  const evidenceRefs = result.items.flatMap((item) => item.evidenceIds.map((evidenceId) => ({
    id: evidenceId,
    type: 'external-reference' as const,
    title: `${item.title} 的证据`,
    summary: item.summary,
    sourceRefIds: result.sourceRefs
      .filter((source) => source.title === item.title)
      .map((source) => source.id || source.url || source.title),
    confidence: {
      level: item.verificationStatus === 'verified' ? 'high' as const : item.verificationStatus ? 'medium' as const : 'unknown' as const,
      basis: 'source' as const,
      explanation: verificationText(item.verificationStatus),
    },
    freshness: {
      status: 'fresh' as const,
      asOf: item.publishedAt,
      retrievedAt: result.generatedAt || new Date().toISOString(),
    },
    verification: {
      status: item.verificationStatus === 'verified'
        ? 'verified' as const
        : item.verificationStatus === 'conflicted'
          ? 'conflicting' as const
          : item.verificationStatus
            ? 'unverified' as const
            : 'unknown' as const,
      verifiedBy: 'tool' as const,
    },
    metadata: {
      gi_item_id: item.id,
      event_type: item.eventType,
      priority: item.priority,
    },
  })));
  return {
    contractType: 'semantic-result',
    version: 'semantic-result/v1',
    resultId: `${ctx.traceId}:gi-intelligence`,
    conversationId: ctx.conversationId,
    messageId: ctx.traceId,
    screenType: 'conversation-answer',
    title: result.title,
    description: result.summary,
    createdAt: new Date().toISOString(),
    producer: { kind: 'tool', name: 'GI Intelligence Service' },
    regions: [
      {
        id: 'gi-intelligence-answer',
        type: 'summary',
        componentBinding: 'markdown-result',
        title: result.mode === 'daily_brief' ? '今日摘要' : '文章流',
        state: result.items.length ? 'ready' : result.status === 'failed' ? 'error' : 'empty',
        data: {
          markdown: answer,
          mode: result.mode,
          total: result.total,
          generatedAt: result.generatedAt,
        },
        sourceRefs: result.sourceRefs.map((source) => source.id || source.url || source.title),
        evidenceRefs: result.evidenceRefs,
        runtimeRefs: processEventIds,
      },
      {
        id: 'gi-intelligence-feed',
        type: 'source',
        componentBinding: 'source-list',
        title: '文章来源',
        state: result.sourceRefs.length ? 'ready' : 'empty',
        data: {
          items: result.items,
          source_refs: result.sourceRefs,
          nextQuery: {
            ...result.query,
            page: (result.query.page || 1) + 1,
          },
        },
        sourceRefs: result.sourceRefs.map((source) => source.id || source.url || source.title),
      },
    ],
    sourceRefs,
    evidenceRefs,
    runtimeRefs: processEventIds.map((id) => ({ id, kind: 'event' })),
    freshness: {
      status: result.generatedAt || result.items.some((item) => item.publishedAt) ? 'fresh' : 'unknown',
      generatedAt: result.generatedAt,
      retrievedAt: new Date().toISOString(),
    },
    confidence: {
      level: result.status === 'success' ? 'medium' : 'low',
      basis: 'source',
      explanation: result.items.length ? '已取得 GI 返回的文章或事件来源。' : '当前未取得可展示文章。',
    },
    metadata: {
      gi_intelligence: {
        query: result.query,
        warnings: result.warnings,
        seedExpansion: result.seedExpansion,
      },
    },
  };
}

function recordGiEvidence(ctx: ChatPipelineContext, io: StreamIO, result: GiIntelligenceResult) {
  const sourceEntries = result.items.map((item) => ({
    stage: 'public_web' as const,
    source: 'public_web' as const,
    sourceId: item.url || item.id,
    confidence: item.verificationStatus === 'verified' ? 'confirmed_fact' as const : 'unverified' as const,
    content: {
      provider: 'gi_intelligence',
      item_id: item.id,
      title: item.title,
      summary: item.summary,
      event_type: item.eventType,
      priority: item.priority,
      verification_status: item.verificationStatus,
      published_at: item.publishedAt,
    },
    sourceRefId: `gi-source-${item.id}`.replace(/[^a-zA-Z0-9:_./-]+/g, '_'),
    evidenceRefId: item.evidenceIds[0],
  }));
  let ledger = recordEvidence(io.getEvidenceLedger(), {
    stage: 'public_web',
    source: 'tool_result',
    sourceId: 'gi_intelligence_service',
    confidence: result.status === 'success' ? 'confirmed_fact' : 'unverified',
    content: {
      mode: result.mode,
      status: result.status,
      total: result.total,
      item_count: result.items.length,
      query: result.query,
      warnings: result.warnings,
    },
  });
  ledger = recordEvidenceBatch(ledger, sourceEntries);
  io.setEvidenceLedger(ledger);
  return ledger;
}

export function shouldEnterGiIntelligenceStage(ctx: ChatPipelineContext): boolean {
  return Boolean(buildGiQueryFromMessage(ctx.message, ctx.body.metadata));
}

export async function executeGiIntelligenceStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  const query = buildGiQueryFromMessage(ctx.message, ctx.body.metadata);
  if (!query) return {};

  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);
  io.pushEvent(createProcessEvent({
    type: 'stage.started',
    label: '读取行业情报',
    summary: query.mode === 'daily_brief' ? '正在获取今日摘要。' : '正在获取相关文章。',
    status: 'running',
    visibility: 'user',
    tool_name: 'gi_intelligence_service',
    provider: 'api',
    input: {
      mode: query.mode,
      since: query.since,
      sourceType: query.sourceType,
      keyword: query.keyword,
      limit: query.limit,
      expandSeeds: query.expandSeeds,
    },
  }));

  const result = await fetchGiIntelligence(query);
  pushSourceAttachedEvents(io.push, result.sourceRefs.map((source) => ({
    title: source.title,
    source: source.source,
    url: source.url,
    source_type: source.source_type,
    icon: source.icon,
    prompt: source.prompt || source.snippet,
  })));

  const ledger = recordGiEvidence(ctx, io, result);
  if (ctx.caseFrame && ledger.entries.length > 0) {
    const latestEvidenceId = ledger.entries[ledger.entries.length - 1].id;
    await addEvidenceRef(ctx.userScopeKey, ctx.caseFrame, latestEvidenceId);
  }

  const answer = buildAnswer(result);
  io.pushEvent(createProcessEvent({
    type: 'stage.ended',
    label: '行业情报已返回',
    summary: result.summary,
    status: result.status === 'success' || result.status === 'partial' ? 'success' : result.status === 'empty' ? 'waiting' : 'error',
    visibility: 'user',
    tool_name: 'gi_intelligence_service',
    provider: 'api',
    output: {
      mode: result.mode,
      status: result.status,
      total: result.total,
      item_count: result.items.length,
      evidence_refs: result.evidenceRefs,
      seedExpansion: result.seedExpansion,
      warnings: result.warnings,
    },
  }));

  await io.endPlanningAndStartExecution();

  const runtimeState = createRuntimeState(
    ctx.startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'response_generation'],
    result.status === 'success' || result.status === 'partial' ? 'completed' : result.status === 'empty' ? 'degraded' : 'failed',
  );
  const processEvents = io.getProcessEvents();
  const semanticResult = buildSemanticResult(ctx, result, answer, processEvents.map((event) => event.id));
  const businessSummary = {
    title: result.title,
    brief: result.summary,
    severity: result.status === 'failed' ? 'medium' as const : 'info' as const,
    confidence: result.items.length ? 'medium' as const : 'low' as const,
    type: 'gi_intelligence_feed',
    kind: 'chat' as const,
  };
  const answerPolicy = {
    ...defaultAnswerPolicy(),
    evidence_visibility: 'expanded' as const,
  };
  const messageContract: MessageContract = buildSemanticMessageContract({
    type: 'chat',
    answerMarkdown: answer,
    businessSummary,
    semanticResult,
    runtimeState,
    answerPolicy,
    evidenceBundle: {
      source_refs: result.sourceRefs,
      evidence_refs: result.evidenceRefs,
    },
  });
  const workflowResult = buildSemanticWorkflowResult({
    taskId: ctx.traceId,
    kind: 'general',
    resultType: 'help_answer',
    answer,
    businessSummary,
    semanticResult,
    runtimeState,
    answerPolicy,
    evidenceBundle: {
      source_refs: result.sourceRefs,
      evidence_refs: result.evidenceRefs,
    },
    nextActions: result.total && result.total > result.items.length ? ['继续看下一批'] : [],
  });
  const answerOrigin = buildAnswerOrigin({
    source: result.items.length ? 'external_service' : 'model_unavailable',
    composerName: 'gi_intelligence_answer',
    provider: 'gi_intelligence_service',
    summary: result.summary,
    metadata: {
      mode: result.mode,
      query: result.query,
      warnings: result.warnings,
      seedExpansion: result.seedExpansion,
    },
  });
  const responseContract = buildResponseContract({
    status: result.status === 'success' || result.status === 'partial'
      ? 'success'
      : result.status === 'empty'
        ? 'empty'
        : result.status,
    intentType: ctx.route.intent_type as any,
    traceId: ctx.traceId,
    answer,
    workflowResult,
    answerOrigin,
    processEvents,
    metadata: {
      evidence_mode: result.items.length ? 'source_grounded' : 'insufficient_evidence',
      answer_origin: answerOrigin,
      semantic_result: semanticResult,
      business_summary: businessSummary,
      evidence_refs: result.evidenceRefs,
      gi_intelligence: {
        query: result.query,
        status: result.status,
        total: result.total,
        item_count: result.items.length,
        seedExpansion: result.seedExpansion,
        warnings: result.warnings,
      },
    },
  });
  const runtimeProjection = buildMessageRuntimeProjection({
    messageId: ctx.traceId,
    threadId: ctx.conversationId,
    traceId: ctx.traceId,
    workflow: 'gi_intelligence',
    intent: ctx.route.intent_type as any,
    status: result.status,
    routeReason: 'GI 情报服务返回行业文章与摘要。',
    runtimeState,
    answerPolicy,
    content: answer,
    promptConfig: ctx.promptConfigMetadata,
    compiledContext: ctx.compiledContext,
    messageContract,
    semanticResult: semanticResult as unknown as Record<string, unknown>,
    processEvents,
    traceUrl: buildTraceUrl(ctx.traceId, getTraceConfigSync().workspaceId),
    modelParticipation: [],
    answerOrigin,
  });
  const traceMeta = await emitChatMessageTrace({
    traceId: ctx.traceId,
    message: ctx.message,
    conversationId: ctx.conversationId,
    threadId: ctx.conversationId,
    messageId: ctx.traceId,
    turnId: ctx.traceId,
    intentType: ctx.route.intent_type as any,
    status: result.status,
    routeReason: 'gi_intelligence_service',
    finalAnswer: answer,
    runtimeProjection,
    extra: {
      project_context_summary: ctx.projectContextSummary,
      semantic_result: semanticResult,
      gi_intelligence: responseContract.metadata?.gi_intelligence,
    },
  });

  io.push({ type: 'route', intent: ctx.route.intent_type, hasThinking: true, toolsUsed: ['gi_intelligence_service'] });
  io.pushRuntimeState('response_generation', ['understanding', 'context_loading', 'data_fetching']);
  io.push({ type: 'content', content: answer });
  io.push({
    type: 'done',
    termination: 'server_done',
    result: {
      answer,
      response_contract: responseContract,
      semantic_result: semanticResult,
      business_summary: businessSummary,
      workflow_result: workflowResult,
      message_contract: messageContract,
      runtime_state: runtimeState,
      answer_policy: answerPolicy,
      structured_payload: {
        gi_intelligence: result,
        source_refs: result.sourceRefs,
      },
    },
    metadata: {
      process_events: processEvents,
      project_context_summary: ctx.projectContextSummary,
      compiled_context: ctx.compiledContext,
      prompt_config: ctx.promptConfigMetadata,
      runtime_state: runtimeState,
      workflow_result: workflowResult,
      message_contract: messageContract,
      response_contract: responseContract,
      semantic_result: semanticResult,
      business_summary: businessSummary,
      trace_meta: traceMeta,
      trace_url: traceMeta?.trace_url,
      thread_id: ctx.conversationId,
      message_id: ctx.traceId,
      turn_id: ctx.traceId,
      message_runtime_projection: runtimeProjection,
      source_refs: result.sourceRefs,
      gi_intelligence: result,
    },
  });
  io.close();
  return { terminal: true, content: answer };
}
