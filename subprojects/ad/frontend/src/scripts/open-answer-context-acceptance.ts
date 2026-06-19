import assert from 'node:assert/strict';
import {
  buildOpenAnswerCapabilityOverview,
  buildOpenAnswerPlannerProjection,
  buildOpenAnswerPlanningAudit,
  buildOpenAnswerPlanningMetadata,
  selectOpenAnswerContextCandidates,
  type OpenAnswerIntentOrchCandidate,
  type OpenAnswerRouteCandidate,
} from '../src/lib/open-answer-planner-context';

const routeCandidate: OpenAnswerRouteCandidate = {
  source: 'request_understanding',
  intent_type: 'general',
  service_intent: 'general_chat',
  confidence: 'medium',
  reason: 'acceptance route candidate',
};

const disabledIntentOrch: OpenAnswerIntentOrchCandidate = {
  source: 'intentorch',
  status: 'disabled',
  duration_ms: 0,
  parsed_intent_count: 0,
  tool_selection_count: 0,
  suggested_tools: [],
  risk_flags: [],
};

function assertKnowledgeEvidenceChangesPlanning(): void {
  const projection = buildOpenAnswerPlannerProjection({
    routeCandidate,
    intentOrchCandidate: disabledIntentOrch,
    knowledge: {
      available: true,
      status: 'searched',
      hitCount: 2,
      hits: [
        { title: 'internal policy', content: 'internal explanation' },
        { title: 'field definition', content: 'definition text' },
      ],
    },
    hasProjectContext: false,
    hasMemoryContext: false,
  });

  assert.equal(projection.arbitrationSummary.evidence_mode_hint, 'knowledge_grounded');
  assert.equal(projection.arbitrationSummary.evidence_need, 'recommended');
  assert(projection.arbitrationSummary.candidate_sources.includes('knowledge'));
  assert(projection.arbitrationSummary.rejected_authorities.includes('raw_context_dump'));
  assert(projection.plannerCandidates.some(item => item.source === 'knowledge' && 'hit_count' in item && item.hit_count === 2));

  const audit = buildOpenAnswerPlanningAudit({
    plannerCandidates: projection.plannerCandidates,
    arbitrationSummary: projection.arbitrationSummary,
  });
  assert.equal(audit.status, 'success');
  assert(/知识库证据/.test(audit.summary), 'planning audit should disclose knowledge-grounded evidence mode');
}

function assertKnowledgeNoHitDoesNotFabricateEvidence(): void {
  const projection = buildOpenAnswerPlannerProjection({
    routeCandidate,
    intentOrchCandidate: disabledIntentOrch,
    knowledge: { available: true, status: 'searched', hitCount: 0, knowledgeBaseCount: 1 },
    hasProjectContext: false,
    hasMemoryContext: false,
  });

  assert.equal(projection.arbitrationSummary.evidence_mode_hint, 'model_only');
  assert(projection.arbitrationSummary.risk_flags.includes('knowledge_no_hit'));
  assert(projection.plannerCandidates.some(item => item.source === 'knowledge' && 'status' in item && item.status === 'no_hit'));
}

function assertStaleKnowledgeRequiresRefresh(): void {
  const projection = buildOpenAnswerPlannerProjection({
    routeCandidate,
    intentOrchCandidate: disabledIntentOrch,
    knowledge: {
      available: true,
      status: 'stale',
      hitCount: 1,
      hits: [{ title: 'old position', content: 'raw stale internal wording' }],
    },
    hasProjectContext: false,
    hasMemoryContext: false,
  });
  const metadata = buildOpenAnswerPlanningMetadata({
    plannerCandidates: projection.plannerCandidates,
    arbitrationSummary: projection.arbitrationSummary,
  });
  const serialized = JSON.stringify(metadata);

  assert.equal(projection.arbitrationSummary.evidence_mode_hint, 'insufficient_evidence');
  assert.equal(projection.arbitrationSummary.evidence_need, 'required');
  assert(projection.arbitrationSummary.risk_flags.includes('knowledge_requires_refresh_before_confident_answer'));
  assert(!serialized.includes('raw stale internal wording'), 'planner metadata must not expose raw stale knowledge chunks');
}

function assertMemoryAndRecentContextSelection(): void {
  const now = new Date('2026-06-13T00:00:00.000Z');
  const memorySelection = selectOpenAnswerContextCandidates({
    message: '帮我按简洁风格总结增长实验复盘',
    now,
    limit: 1,
    minScore: 0.16,
    candidates: [
      {
        id: 'memory-preferred-style',
        source: 'memory',
        title: '表达偏好',
        content: '用户偏好简洁风格，喜欢先给结论再给依据。',
        updatedAt: '2026-06-12T00:00:00.000Z',
        importance: 0.9,
        keywords: ['简洁', '总结', '复盘'],
      },
      {
        id: 'memory-unrelated',
        source: 'memory',
        title: '无关记忆',
        content: '用户上次询问过素材命名规范。',
        updatedAt: '2026-06-12T00:00:00.000Z',
        importance: 0.9,
        keywords: ['素材', '命名'],
      },
    ],
  });
  assert.equal(memorySelection.selected[0]?.id, 'memory-preferred-style');
  assert(memorySelection.rejected.some(item => item.id === 'memory-unrelated'), 'unrelated memory should be rejected');

  const recentSelection = selectOpenAnswerContextCandidates({
    message: '继续整理增长实验复盘',
    now,
    limit: 1,
    minScore: 0.16,
    candidates: [
      {
        id: 'recent-related',
        source: 'recent_conversation',
        title: '增长实验复盘',
        content: '上一轮讨论了增长实验的转化漏斗和结论结构。',
        updatedAt: '2026-06-12T00:00:00.000Z',
        importance: 0.4,
      },
      {
        id: 'recent-unrelated',
        source: 'recent_conversation',
        title: '接口配置',
        content: '上一轮讨论接口鉴权配置。',
        updatedAt: '2026-06-12T00:00:00.000Z',
        importance: 0.4,
      },
    ],
  });
  assert.equal(recentSelection.selected[0]?.id, 'recent-related');

  const projection = buildOpenAnswerPlannerProjection({
    routeCandidate,
    intentOrchCandidate: disabledIntentOrch,
    knowledge: { available: false, status: 'not_configured', hits: [] },
    hasProjectContext: false,
    hasMemoryContext: memorySelection.selected.length > 0 || recentSelection.selected.length > 0,
  });
  assert.equal(projection.arbitrationSummary.evidence_mode_hint, 'model_only');
  assert.equal(projection.arbitrationSummary.evidence_need, 'optional');

  const metadata = buildOpenAnswerPlanningMetadata({
    plannerCandidates: projection.plannerCandidates,
    arbitrationSummary: projection.arbitrationSummary,
    contextSelection: {
      memory: memorySelection,
      recentConversations: recentSelection,
    },
  });
  const contextSelection = metadata.context_selection as Record<string, unknown>;
  const memory = contextSelection.memory as Record<string, unknown>;
  const recent = contextSelection.recent_conversations as Record<string, unknown>;
  assert.equal(memory.selected_count, 1);
  assert.equal(recent.selected_count, 1);
}

function assertCapabilityOverviewIncludesDynamicSignals(): void {
  const overview = buildOpenAnswerCapabilityOverview({
    capabilityManifest: [
      {
        capabilityId: 'capability-data-query',
        displayName: '数据查询',
        capabilityType: 'mcp_tool',
        source: { toolName: 'query_data', serverId: 'internal' },
      },
    ],
    knowledge: { available: true, status: 'searched', hitCount: 1, hits: [{ title: 'policy' }] },
    hasProjectContext: true,
    availableProjectCount: 2,
    activePreferenceCount: 1,
    memoryCount: 1,
    recentQuestionCount: 1,
  });

  const signals = overview.capability_overview.dynamic_signals;
  const knowledge = signals.find(item => item.key === 'knowledge_context');
  const preference = signals.find(item => item.key === 'preference_memory');
  const tool = signals.find(item => item.key === 'tool_capability_manifest');
  assert.equal(knowledge?.available, true);
  assert.equal(knowledge?.count, 1);
  assert.equal(preference?.available, true);
  assert.equal(preference?.count, 3);
  assert.equal(tool?.available, true);
  assert.equal(tool?.count, 1);
}

function main(): void {
  assertKnowledgeEvidenceChangesPlanning();
  assertKnowledgeNoHitDoesNotFabricateEvidence();
  assertStaleKnowledgeRequiresRefresh();
  assertMemoryAndRecentContextSelection();
  assertCapabilityOverviewIncludesDynamicSignals();
  console.log('open answer context acceptance passed');
}

main();
