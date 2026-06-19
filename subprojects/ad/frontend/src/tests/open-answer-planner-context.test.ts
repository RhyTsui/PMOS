import { describe, expect, it, vi } from 'vitest';
import {
  buildOpenAnswerKnowledgeCandidate,
  buildOpenAnswerCapabilityOverview,
  buildOpenAnswerPlanningAudit,
  buildOpenAnswerPlannerProjection,
  buildOpenAnswerPlanningMetadata,
  collectIntentOrchCandidateForOpenAnswer,
  selectOpenAnswerContextCandidates,
  summarizeIntentOrchCandidate,
} from '../src/lib/open-answer-planner-context';
import type { IntentOrchEnhancementInput, IntentOrchEnhancementResult } from '../src/lib/intent-orch-enhancer';

const baseInput: IntentOrchEnhancementInput = {
  message: '你好，请用一句话说明你现在可以帮我做什么。',
  userRequirement: {
    metrics: [],
    dimensions: [],
    dateRange: { type: 'unknown' },
    task: 'general',
  },
  routeIntent: 'general',
  conversationHistory: [],
};

describe('open answer planner context', () => {
  it('summarizes IntentOrch without exposing mapped tool parameters', () => {
    const result: IntentOrchEnhancementResult = {
      success: true,
      durationMs: 42,
      warnings: [],
      toolDigests: [{ name: 'secret-tool', description: 'tool description', serverName: 'server-a' }],
      plan: {
        parsedIntents: [{
          id: 'intent-1',
          type: 'open_answer',
          description: '回答用户能做什么',
          parameters: { raw_tool_args: 'must-not-leak' },
        }],
        toolSelections: [{
          intentId: 'intent-1',
          toolName: 'capability.search',
          toolDescription: '查询可用能力',
          mappedParameters: { app_id: 'secret-app-id', raw_tool_result: 'must-not-leak' },
          confidence: 0.82,
        }],
        executionOrder: ['intent-1'],
        dependencies: [],
        estimatedSteps: 1,
      },
    };

    const candidate = summarizeIntentOrchCandidate(result);
    const serialized = JSON.stringify(candidate);

    expect(candidate.status).toBe('success');
    expect(candidate.tool_selection_count).toBe(1);
    expect(candidate.suggested_tools[0]).toEqual(expect.objectContaining({
      tool_name: 'capability.search',
      confidence: 0.82,
    }));
    expect(serialized).not.toContain('mappedParameters');
    expect(serialized).not.toContain('raw_tool_args');
    expect(serialized).not.toContain('raw_tool_result');
    expect(serialized).not.toContain('secret-app-id');
    expect(serialized).not.toContain('must-not-leak');
  });

  it('returns a timeout candidate instead of blocking open answer composition', async () => {
    const candidate = await collectIntentOrchCandidateForOpenAnswer(baseInput, {
      timeoutMs: 1,
      runner: () => new Promise(() => undefined),
    });

    expect(candidate.status).toBe('timeout');
    expect(candidate.risk_flags).toContain('candidate_timeout');
    expect(candidate.timeout_ms).toBe(1);
    expect(candidate.suggested_tools).toEqual([]);
  });

  it('honors the runtime timeout budget for open answer IntentOrch candidates', async () => {
    const previousTimeout = process.env.XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS;
    process.env.XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS = '600';
    vi.useFakeTimers();
    try {
      const candidatePromise = collectIntentOrchCandidateForOpenAnswer(baseInput, {
        runner: () => new Promise(() => undefined),
      });

      await vi.advanceTimersByTimeAsync(600);
      const candidate = await candidatePromise;

      expect(candidate.status).toBe('timeout');
      expect(candidate.timeout_ms).toBe(600);
    } finally {
      if (previousTimeout === undefined) {
        delete process.env.XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS;
      } else {
        process.env.XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS = previousTimeout;
      }
      vi.useRealTimers();
    }
  });

  it('normalizes IntentOrch SDK errors before exposing planner metadata', () => {
    const candidate = summarizeIntentOrchCandidate({
      success: false,
      durationMs: 9,
      warnings: [],
      toolDigests: [],
      plan: null,
      error: 'Cloud Intent Engine not initialized. Call initCloudIntentEngine() first.',
    });
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'help' },
      intentOrchCandidate: candidate,
      knowledge: { hitCount: 0 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });
    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify({ candidate, metadata });

    expect(candidate.status).toBe('failed');
    expect(candidate.error).toBe('engine_not_initialized');
    expect(serialized).not.toContain('Cloud Intent Engine');
    expect(serialized).not.toContain('initCloudIntentEngine');
  });

  it('projects knowledge and context evidence into arbitration summary', () => {
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: {
        source: 'request_understanding',
        intent_type: 'general',
        confidence: 0.7,
      },
      intentOrchCandidate: summarizeIntentOrchCandidate(null),
      knowledge: { hitCount: 2 },
      hasProjectContext: true,
      hasMemoryContext: false,
    });

    expect(projection.plannerCandidates).toHaveLength(3);
    expect(projection.plannerCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'knowledge',
        status: 'searched',
        hit_count: 2,
        evidence_role: 'candidate_evidence',
      }),
    ]));
    expect(projection.arbitrationSummary).toEqual(expect.objectContaining({
      selected_composer: 'chat_answer_composer',
      evidence_mode_hint: 'mixed_context',
      evidence_need: 'recommended',
      final_authority: 'contract_safety',
    }));
    expect(projection.arbitrationSummary.candidate_sources).toEqual(['request_understanding', 'knowledge']);
    expect(projection.arbitrationSummary.rejected_authorities).toContain('prompt_keyword_routing');
  });

  it('records knowledge no-hit as a candidate without fabricating internal evidence', () => {
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: {
        source: 'request_understanding',
        intent_type: 'general',
        confidence: 0.7,
      },
      intentOrchCandidate: summarizeIntentOrchCandidate(null),
      knowledge: { available: true, status: 'searched', hitCount: 0, knowledgeBaseCount: 1 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });
    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify(metadata);

    expect(projection.arbitrationSummary.evidence_mode_hint).toBe('model_only');
    expect(projection.arbitrationSummary.risk_flags).toContain('knowledge_no_hit');
    expect(serialized).toContain('"source":"knowledge"');
    expect(serialized).toContain('"status":"no_hit"');
    expect(serialized).not.toContain('knowledge answer');
  });

  it('treats stale knowledge as verification only and requires refreshed evidence', () => {
    const candidate = buildOpenAnswerKnowledgeCandidate({
      available: true,
      status: 'stale',
      hitCount: 1,
      hits: [{ title: 'old policy', content: 'raw stale wording must not leak' }],
    });
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'general' },
      intentOrchCandidate: summarizeIntentOrchCandidate(null),
      knowledge: { available: true, status: 'stale', hitCount: 1, hits: [{ title: 'old policy', content: 'raw stale wording must not leak' }] },
      hasProjectContext: false,
      hasMemoryContext: false,
    });
    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify(metadata);

    expect(candidate.evidence_role).toBe('verification');
    expect(candidate.freshness).toBe('stale');
    expect(projection.arbitrationSummary.evidence_mode_hint).toBe('insufficient_evidence');
    expect(projection.arbitrationSummary.evidence_need).toBe('required');
    expect(projection.arbitrationSummary.risk_flags).toContain('knowledge_requires_refresh_before_confident_answer');
    expect(serialized).toContain('knowledge_stale_or_old_position');
    expect(serialized).not.toContain('raw stale wording must not leak');
  });

  it('does not authorize tool execution from IntentOrch candidates without evidence', () => {
    const intentOrchCandidate = summarizeIntentOrchCandidate({
      success: true,
      durationMs: 30,
      warnings: [],
      toolDigests: [],
      plan: {
        parsedIntents: [{ id: 'intent-1', type: 'lookup', description: '候选工具', parameters: {} }],
        toolSelections: [{
          intentId: 'intent-1',
          toolName: 'external.search',
          toolDescription: '候选工具',
          mappedParameters: { query: 'hidden' },
          confidence: 0.8,
        }],
        executionOrder: ['intent-1'],
        dependencies: [],
        estimatedSteps: 1,
      },
    });

    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'general' },
      intentOrchCandidate,
      knowledge: { hitCount: 0 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });

    expect(projection.arbitrationSummary.evidence_mode_hint).toBe('insufficient_evidence');
    expect(projection.arbitrationSummary.evidence_need).toBe('required');
    expect(projection.arbitrationSummary.risk_flags).toContain('tool_candidate_requires_execution_policy');
    expect(JSON.stringify(projection)).not.toContain('mappedParameters');
    expect(JSON.stringify(projection)).not.toContain('hidden');
  });

  it('projects public web results as evidence candidates instead of hidden direct authority', () => {
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'general', confidence: 0.68 },
      intentOrchCandidate: summarizeIntentOrchCandidate(null),
      publicWebCandidate: {
        source: 'public_web',
        status: 'success',
        capability_type: 'public_web_qa',
        reason_code: 'public_web.default_general_lookup',
        source_count: 2,
        source_required: false,
        confidence: 0.72,
        evidence_role: 'candidate_evidence',
        risk_flags: ['public_web_requires_composer_arbitration'],
      },
      knowledge: { hitCount: 0 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });
    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify(metadata);

    expect(projection.plannerCandidates.map(candidate => candidate.source)).toContain('public_web');
    expect(projection.arbitrationSummary.candidate_sources).toContain('public_web');
    expect(projection.arbitrationSummary.evidence_mode_hint).toBe('mixed_context');
    expect(serialized).toContain('candidate_evidence');
    expect(serialized).not.toContain('raw_tool_result');
    expect(serialized).not.toContain('mappedParameters');
  });

  it('builds compact planning metadata for response and runtime audit', () => {
    const intentOrchCandidate = summarizeIntentOrchCandidate({
      success: true,
      durationMs: 12,
      warnings: [],
      toolDigests: [],
      plan: {
        parsedIntents: [{ id: 'intent-1', type: 'lookup', description: '候选工具', parameters: { raw_tool_args: 'blocked' } }],
        toolSelections: [{
          intentId: 'intent-1',
          toolName: 'knowledge.search',
          toolDescription: '知识库候选',
          mappedParameters: { query: 'secret-query' },
          confidence: 0.72,
        }],
        executionOrder: ['intent-1'],
        dependencies: [],
        estimatedSteps: 1,
      },
    });
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'general', confidence: 'medium' },
      intentOrchCandidate,
      knowledge: { hitCount: 1 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });

    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata).toHaveProperty('planner_candidates');
    expect(metadata).toHaveProperty('arbitration_summary');
    expect(serialized).toContain('knowledge.search');
    expect(serialized).toContain('contract_safety');
    expect(serialized).not.toContain('mappedParameters');
    expect(serialized).not.toContain('secret-query');
    expect(serialized).not.toContain('raw_tool_args');
  });

  it('selects cross-session context with generic relevance decay and importance instead of raw recent slicing', () => {
    const selection = selectOpenAnswerContextCandidates({
      message: '帮我总结一下素材复盘里提到的创意方向',
      limit: 2,
      minScore: 0.16,
      now: new Date('2026-06-12T00:00:00.000Z'),
      candidates: [
        {
          id: 'memory-creative',
          source: 'memory',
          title: '素材复盘偏好',
          content: '用户常让助手总结素材复盘里的创意方向和下一步动作。',
          importance: 0.9,
          updatedAt: '2026-06-11T00:00:00.000Z',
          keywords: ['素材', '复盘', '创意方向'],
        },
        {
          id: 'conversation-related',
          source: 'recent_conversation',
          title: '上一轮素材复盘',
          content: '讨论过素材复盘和创意方向。',
          updatedAt: '2026-06-10T00:00:00.000Z',
        },
        {
          id: 'conversation-old',
          source: 'recent_conversation',
          title: '无关旧会话',
          content: '登录缓存和浏览器窗口处理。',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(selection.policy.strategy).toBe('generic_relevance_decay_importance');
    expect(selection.selected.map(item => item.id)).toEqual(['memory-creative', 'conversation-related']);
    expect(selection.rejected.map(item => item.id)).toContain('conversation-old');
    expect(selection.rejected.find(item => item.id === 'conversation-old')?.reasons).toContain('below_min_score');
  });

  it('rejects preference memory when the current turn explicitly overrides it', () => {
    const selection = selectOpenAnswerContextCandidates({
      message: '这次不要按简洁风格，请详细展开复盘结论和依据',
      limit: 2,
      minScore: 0.16,
      now: new Date('2026-06-12T00:00:00.000Z'),
      candidates: [
        {
          id: 'memory-concise-style',
          source: 'memory',
          title: '表达偏好',
          content: '用户偏好简洁风格，先给结论再给依据。',
          importance: 1,
          updatedAt: '2026-06-12T00:00:00.000Z',
          keywords: ['简洁', '风格', '复盘'],
          metadata: { memory_type: 'preference' },
        },
      ],
    });
    const rejected = selection.rejected.find(item => item.id === 'memory-concise-style');

    expect(selection.selected.map(item => item.id)).not.toContain('memory-concise-style');
    expect(rejected?.reasons).toContain('explicit_user_constraint_conflict');
    expect(rejected?.reasons).toContain('current_turn_overrides_memory');
  });

  it('adds context selection audit to planning metadata without dumping selected content', () => {
    const contextSelection = {
      memory: selectOpenAnswerContextCandidates({
        message: '总结素材方向',
        limit: 1,
        now: new Date('2026-06-12T00:00:00.000Z'),
        candidates: [{
          id: 'memory-secret',
          source: 'memory' as const,
          content: '这是一段不应该进入 planning metadata 的完整记忆内容',
          importance: 1,
          updatedAt: '2026-06-12T00:00:00.000Z',
          keywords: ['素材方向'],
        }],
      }),
    };
    const metadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: [{ source: 'request_understanding', intent_type: 'general' }],
      arbitrationSummary: {
        selected_composer: 'chat_answer_composer',
        evidence_mode_hint: 'model_only',
        evidence_need: 'optional',
        candidate_sources: ['request_understanding'],
        risk_flags: [],
        rejected_authorities: ['raw_context_dump'],
        final_authority: 'contract_safety',
      },
      contextSelection,
    });
    const serialized = JSON.stringify(metadata);

    expect(serialized).toContain('context_selection');
    expect(serialized).toContain('memory-secret');
    expect(serialized).toContain('selected_count');
    expect(serialized).not.toContain('完整记忆内容');
    expect(serialized).not.toContain('raw_tool_args');
  });

  it('builds capability overview from dynamic signals without changing assistant identity', () => {
    const overview = buildOpenAnswerCapabilityOverview({
      capabilityManifest: [
        {
          capabilityId: 'report.daily',
          displayName: '日报查询',
          capabilityType: 'data.report',
          source: { toolName: 'get_daily_report', serverId: 'mcp-a' },
        },
        {
          capabilityId: 'asset.lookup',
          displayName: '素材查询',
          capabilityType: 'asset.lookup',
          source: { toolName: 'search_assets', serverId: 'mcp-a' },
        },
      ],
      knowledge: { available: true, status: 'searched', hitCount: 2 },
      hasProjectContext: true,
      availableProjectCount: 3,
      activePreferenceCount: 1,
      memoryCount: 2,
      recentQuestionCount: 1,
    });

    const serialized = JSON.stringify(overview);

    expect(overview.assistant_profile.identity).toBe('小乔智投通用 AI 助手');
    expect(overview.assistant_profile.role_boundary).toContain('不改变助手身份');
    expect(overview.capability_overview.dynamic_signals.map(item => item.key)).toContain('knowledge_context');
    expect(overview.capability_overview.dynamic_signals.map(item => item.key)).toContain('preference_memory');
    expect(overview.capability_overview.manifest_summary).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'data.report', count: 1 }),
      expect.objectContaining({ type: 'asset.lookup', count: 1 }),
    ]));
    expect(serialized).not.toContain('raw_tool_args');
    expect(serialized).not.toContain('mappedParameters');
  });

  it('builds a non-running planning audit for insufficient evidence', () => {
    const intentOrchCandidate = summarizeIntentOrchCandidate({
      success: true,
      durationMs: 18,
      warnings: [],
      toolDigests: [],
      plan: {
        parsedIntents: [{ id: 'intent-1', type: 'lookup', description: '候选工具', parameters: { raw_tool_args: 'blocked' } }],
        toolSelections: [{
          intentId: 'intent-1',
          toolName: 'external.search',
          toolDescription: '候选工具',
          mappedParameters: { query: 'secret-query' },
          confidence: 0.7,
        }],
        executionOrder: ['intent-1'],
        dependencies: [],
        estimatedSteps: 1,
      },
    });
    const projection = buildOpenAnswerPlannerProjection({
      routeCandidate: { source: 'request_understanding', intent_type: 'general' },
      intentOrchCandidate,
      knowledge: { hitCount: 0 },
      hasProjectContext: false,
      hasMemoryContext: false,
    });

    const audit = buildOpenAnswerPlanningAudit({
      plannerCandidates: projection.plannerCandidates,
      arbitrationSummary: projection.arbitrationSummary,
    });
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe('rejected');
    expect(audit.summary).toContain('证据模式：证据不足');
    expect(serialized).toContain('tool_candidate_requires_execution_policy');
    expect(serialized).not.toContain('mappedParameters');
    expect(serialized).not.toContain('secret-query');
    expect(serialized).not.toContain('raw_tool_args');
  });
});
